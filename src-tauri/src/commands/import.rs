use crate::database::LazyDatabase;
use crate::database::models::{CreateQuestionDto, CreateTopicDto};
use crate::database::repository::{LazyQuestionsRepository, LazyTopicsRepository};
use crate::utils::markdown_parser::{parse_markdown_file, ParsedTopic};
use std::sync::Arc;
use tauri::{AppHandle, Manager};

#[derive(serde::Serialize)]
pub struct TopicImportDetail {
    pub topic_id: String,
    pub topic_name: String,
    pub questions_count: usize,
    pub questions: Vec<QuestionImportDetail>,
}

#[derive(serde::Serialize)]
pub struct QuestionImportDetail {
    pub question_id: String,
    pub question_number: i32,
    pub question: String,
}

#[derive(serde::Serialize)]
pub struct ImportResult {
    pub success: bool,
    pub topics_imported: usize,
    pub questions_imported: usize,
    pub message: String,
    pub errors: Vec<String>,
    pub topics_details: Vec<TopicImportDetail>,
}

#[tauri::command]
pub async fn import_from_markdown(
    content: String,
    app: AppHandle,
) -> Result<ImportResult, String> {
    let db = app.state::<Arc<LazyDatabase>>();

    // Parse the markdown
    let parsed_topics = parse_markdown_file(&content)
        .map_err(|e| format!("Failed to parse markdown: {}", e))?;

    let mut topics_imported = 0;
    let mut questions_imported = 0;
    let mut errors = Vec::new();
    let mut topics_details = Vec::new();

    for parsed_topic in parsed_topics {
        match import_topic(Arc::clone(db.inner()), parsed_topic) {
            Ok((topic_count, question_count, detail)) => {
                topics_imported += topic_count;
                questions_imported += question_count;
                topics_details.push(detail);
            }
            Err(e) => {
                errors.push(e);
            }
        }
    }

    Ok(ImportResult {
        success: errors.is_empty(),
        topics_imported,
        questions_imported,
        message: if errors.is_empty() {
            format!(
                "Successfully imported {} topics and {} questions",
                topics_imported, questions_imported
            )
        } else {
            format!(
                "Imported {} topics and {} questions with {} errors",
                topics_imported,
                questions_imported,
                errors.len()
            )
        },
        errors,
        topics_details,
    })
}

fn import_topic(
    db: Arc<LazyDatabase>,
    parsed_topic: ParsedTopic,
) -> Result<(usize, usize, TopicImportDetail), String> {
    let topics_repo = LazyTopicsRepository::new(Arc::clone(&db));
    let questions_repo = LazyQuestionsRepository::new(Arc::clone(&db));

    // Generate a slug from the topic name
    let slug = generate_slug(&parsed_topic.name);

    // Create the topic
    let topic_dto = CreateTopicDto {
        name: parsed_topic.name.clone(),
        description: format!("Imported topic: {}", parsed_topic.name),
        icon: "📚".to_string(),
        color: "#3B82F6".to_string(),
        slug,
        subtopics: None,
        order: 0,
    };

    let topic = topics_repo
        .create(topic_dto)
        .map_err(|e| format!("Failed to create topic '{}': {}", parsed_topic.name, e))?;

    let topic_id = topic.id;

    // Create questions for this topic
    let mut question_count = 0;
    let mut question_details = Vec::new();

    for parsed_question in parsed_topic.questions {
        let question_dto = CreateQuestionDto {
            topic_id: topic_id.clone(),
            subtopic: None,
            question_number: parsed_question.question_number,
            question: parsed_question.question.clone(),
            answer: crate::database::models::Answer {
                markdown: parsed_question.answer.markdown.clone(),
            },
            tags: vec![parsed_topic.name.clone()],
            difficulty: "intermediate".to_string(),
            order: parsed_question.question_number,
        };

        match questions_repo.create(question_dto) {
            Ok(question) => {
                question_count += 1;
                question_details.push(QuestionImportDetail {
                    question_id: question.id,
                    question_number: parsed_question.question_number,
                    question: parsed_question.question.clone(),
                });
            }
            Err(e) => {
                return Err(format!(
                    "Failed to create question {} in topic '{}': {}",
                    parsed_question.question_number, parsed_topic.name, e
                ));
            }
        }
    }

    let topic_detail = TopicImportDetail {
        topic_id: topic_id.clone(),
        topic_name: parsed_topic.name.clone(),
        questions_count: question_count,
        questions: question_details,
    };

    Ok((1, question_count, topic_detail))
}

fn generate_slug(name: &str) -> String {
    name.to_lowercase()
        .chars()
        .map(|c| {
            if c.is_alphanumeric() {
                c
            } else if c.is_whitespace() {
                '-'
            } else {
                '_'
            }
        })
        .collect::<String>()
        .split('-')
        .filter(|s| !s.is_empty())
        .collect::<Vec<&str>>()
        .join("-")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_generate_slug() {
        assert_eq!(generate_slug("Java & Core Programming"), "java-core-programming");
        assert_eq!(generate_slug("Spring Boot"), "spring-boot");
        assert_eq!(generate_slug("SQL & Databases"), "sql-databases");
    }
}
