import type {
  Question,
  CreateQuestionDto,
  UpdateQuestionDto,
} from "@code-notes/shared";

export interface IQuestionsService {
  getAll(): Promise<Question[]>;
  getById(id: string): Promise<Question | null>;
  getByTopicId(topicId: string): Promise<Question[]>;
  create(dto: CreateQuestionDto): Promise<string>;
  update(id: string, dto: UpdateQuestionDto): Promise<boolean>;
  delete(id: string): Promise<boolean>;
}
