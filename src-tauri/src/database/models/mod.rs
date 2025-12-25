pub mod topic;
pub mod question;
pub mod index;

pub use topic::{Topic, CreateTopicDto, UpdateTopicDto};
pub use question::{Question, CreateQuestionDto, UpdateQuestionDto, Answer};
pub use index::{
    DatabaseIndex, TopicQuestions, TopicsContainer,
};
