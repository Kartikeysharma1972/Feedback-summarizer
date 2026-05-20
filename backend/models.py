from pydantic import BaseModel
from typing import Optional


class SignupRequest(BaseModel):
    name: str
    email: str
    password: str


class LoginRequest(BaseModel):
    email: str
    password: str


class UserResponse(BaseModel):
    id: str
    name: str
    email: str


class FeedbackRequest(BaseModel):
    student_name: str
    feedback_type: str
    context: Optional[str] = None
    tone: str
    grade_level: str
    user_id: str
    ratings: Optional[dict] = None  # {"academic_performance": 4, "behavior": 3, ...}
    rubric_id: Optional[str] = None
    rubric_scores: Optional[dict] = None  # {"criterion_id": 4, ...}
    standards: Optional[list] = None  # [{"code": "CBSE-ENG-R", "name": "Reading Comprehension"}, ...]
    language: str = "english"


class FeedbackResponse(BaseModel):
    id: str
    student_name: str
    feedback_type: str
    context: Optional[str] = None
    tone: str
    grade_level: str
    generated_feedback: str
    ratings: Optional[dict] = None
    sentiment_label: Optional[str] = None
    sentiment_score: Optional[float] = None
    sentiment_breakdown: Optional[dict] = None
    sentiment_keywords: Optional[list] = None
    rubric_id: Optional[str] = None
    rubric_scores: Optional[dict] = None
    standards: Optional[list] = None
    glow_grow: Optional[dict] = None
    language: Optional[str] = "english"
    created_at: str


class RubricCriterionInput(BaseModel):
    name: str
    description: Optional[str] = None
    sort_order: int = 0
    level_1_label: str = "Beginning"
    level_1_description: Optional[str] = None
    level_2_label: str = "Developing"
    level_2_description: Optional[str] = None
    level_3_label: str = "Proficient"
    level_3_description: Optional[str] = None
    level_4_label: str = "Advanced"
    level_4_description: Optional[str] = None
    level_5_label: str = "Exemplary"
    level_5_description: Optional[str] = None


class CreateRubricRequest(BaseModel):
    user_id: str
    name: str
    description: Optional[str] = None
    subject: Optional[str] = None
    grade_level: Optional[str] = None
    criteria: list


class UpdateRubricRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    subject: Optional[str] = None
    grade_level: Optional[str] = None
    criteria: Optional[list] = None


class RubricCriterionResponse(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    sort_order: int = 0
    level_1_label: str = "Beginning"
    level_1_description: Optional[str] = None
    level_2_label: str = "Developing"
    level_2_description: Optional[str] = None
    level_3_label: str = "Proficient"
    level_3_description: Optional[str] = None
    level_4_label: str = "Advanced"
    level_4_description: Optional[str] = None
    level_5_label: str = "Exemplary"
    level_5_description: Optional[str] = None


class RubricResponse(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    subject: Optional[str] = None
    grade_level: Optional[str] = None
    criteria: list = []
    created_at: str
    updated_at: str


class BatchStudentEntry(BaseModel):
    student_name: str
    context: Optional[str] = None
    ratings: Optional[dict] = None
    rubric_scores: Optional[dict] = None
    standards: Optional[list] = None


class BatchFeedbackRequest(BaseModel):
    user_id: str
    feedback_type: str
    tone: str
    grade_level: str
    rubric_id: Optional[str] = None
    standards: Optional[list] = None
    language: str = "english"
    students: list  # list of BatchStudentEntry


class BatchFeedbackResponse(BaseModel):
    total: int
    completed: int
    failed: int
    results: list  # list of FeedbackResponse or error dicts


class ShareTokenRequest(BaseModel):
    user_id: str
    student_name: str


class ShareTokenResponse(BaseModel):
    token: str
    student_name: str
    share_url: str


class StudentPortalData(BaseModel):
    student_name: str
    teacher_name: str
    feedback: list
    stats: dict


class SummarizeRequest(BaseModel):
    document_name: str
    document_type: str
    text: str
    summary_length: str
    user_id: str


class SummaryResponse(BaseModel):
    id: str
    document_name: str
    document_type: str
    summary: str
    summary_length: str
    mindmap_markdown: Optional[str] = None
    created_at: str


class UploadSummarizeRequest(BaseModel):
    document_name: str
    document_type: str
    summary_length: str
    user_id: str
