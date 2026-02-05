export interface Topic {
  id: string;
  name: string;
  description: string;
  slug: string;
  icon: string;
  color: string;
  subtopics?: string[];
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTopicDto {
  name: string;
  description: string;
  slug: string;
  icon: string;
  color: string;
  subtopics?: string[];
  order: number;
}

export interface UpdateTopicDto {
  name?: string;
  description?: string;
  slug?: string;
  icon?: string;
  color?: string;
  subtopics?: string[];
  order?: number;
}

export interface TopicStats {
  id: string;
  name: string;
  question_count: number;
}
