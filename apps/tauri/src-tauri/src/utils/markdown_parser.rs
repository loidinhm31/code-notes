use regex::Regex;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ParsedAnswer {
    pub markdown: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ParsedQuestion {
    pub question_number: i32,
    pub question: String,
    pub answer: ParsedAnswer,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ParsedTopic {
    pub name: String,
    pub questions: Vec<ParsedQuestion>,
}

pub fn parse_markdown_file(content: &str) -> Result<Vec<ParsedTopic>, String> {
    let mut topics: Vec<ParsedTopic> = Vec::new();
    let mut current_topic: Option<ParsedTopic> = None;
    let mut current_question: Option<ParsedQuestion> = None;
    let mut current_answer_content = String::new();
    let mut in_answer_section = false;

    let lines: Vec<&str> = content.lines().collect();
    let mut i = 0;

    while i < lines.len() {
        let line = lines[i].trim();

        // Parse topic (##)
        if line.starts_with("## ") && !line.starts_with("### ") {
            // Save previous topic if exists
            if let Some(mut topic) = current_topic.take() {
                // Save current question if exists
                if let Some(question) = finalize_question(current_question.take(), &current_answer_content) {
                    topic.questions.push(question);
                }
                topics.push(topic);
            }

            let topic_name = line[3..].trim().to_string();
            current_topic = Some(ParsedTopic {
                name: topic_name,
                questions: Vec::new(),
            });
            current_answer_content.clear();
            in_answer_section = false;
        }
        // Parse question (### 1., ### 2., etc.)
        else if line.starts_with("### ") {
            let question_text = line[4..].trim();

            // Check if it's a numbered question
            if let Some(question_num) = extract_question_number(question_text) {
                // Save previous question if exists
                if let Some(topic) = current_topic.as_mut() {
                    if let Some(question) = finalize_question(current_question.take(), &current_answer_content) {
                        topic.questions.push(question);
                    }
                }

                // Remove the number prefix from question text
                let clean_question = remove_question_number_prefix(question_text);

                current_question = Some(ParsedQuestion {
                    question_number: question_num,
                    question: clean_question,
                    answer: ParsedAnswer {
                        markdown: String::new(),
                    },
                });
                current_answer_content.clear();
                in_answer_section = false;
            }
        }
        // Parse answer marker
        else if line.starts_with("**Answer:**") {
            in_answer_section = true;
            current_answer_content.clear();
        }
        // Accumulate answer content
        else if in_answer_section && current_question.is_some() {
            // Skip separator lines
            if line == "---" {
                // This might be end of question, continue
            } else {
                current_answer_content.push_str(line);
                current_answer_content.push('\n');
            }
        }

        i += 1;
    }

    // Save last question and topic
    if let Some(mut topic) = current_topic.take() {
        if let Some(question) = finalize_question(current_question.take(), &current_answer_content) {
            topic.questions.push(question);
        }
        topics.push(topic);
    }

    Ok(topics)
}

fn extract_question_number(text: &str) -> Option<i32> {
    let re = Regex::new(r"^(\d+)\.").ok()?;
    re.captures(text)
        .and_then(|caps| caps.get(1))
        .and_then(|m| m.as_str().parse::<i32>().ok())
}

fn remove_question_number_prefix(text: &str) -> String {
    let re = Regex::new(r"^\d+\.\s*").unwrap();
    re.replace(text, "").to_string()
}

fn finalize_question(
    mut question: Option<ParsedQuestion>,
    answer_content: &str,
) -> Option<ParsedQuestion> {
    if let Some(ref mut q) = question {
        q.answer.markdown = answer_content.trim().to_string();
    }
    question
}


#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_extract_question_number() {
        assert_eq!(extract_question_number("1. What is this?"), Some(1));
        assert_eq!(extract_question_number("10. Another question?"), Some(10));
        assert_eq!(extract_question_number("No number here"), None);
    }

    #[test]
    fn test_remove_question_number_prefix() {
        assert_eq!(
            remove_question_number_prefix("1. What is this?"),
            "What is this?"
        );
        assert_eq!(
            remove_question_number_prefix("10. Another question?"),
            "Another question?"
        );
    }

}
