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


class FeedbackResponse(BaseModel):
    id: str
    student_name: str
    feedback_type: str
    context: Optional[str] = None
    tone: str
    grade_level: str
    generated_feedback: str
    ratings: Optional[dict] = None
    created_at: str


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
    created_at: str


class UploadSummarizeRequest(BaseModel):
    document_name: str
    document_type: str
    summary_length: str
    user_id: str
