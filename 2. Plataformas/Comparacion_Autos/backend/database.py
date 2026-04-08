"""Database models – SQLite via SQLAlchemy."""
from __future__ import annotations
import datetime
from sqlalchemy import create_engine, Column, Integer, String, Boolean, DateTime, Text, ForeignKey
from sqlalchemy.orm import declarative_base, sessionmaker, relationship

DATABASE_URL = "sqlite:///./radarauto.db"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(bind=engine)
Base = declarative_base()


class User(Base):
    __tablename__ = "users"
    id            = Column(Integer, primary_key=True)
    email         = Column(String, unique=True, nullable=False, index=True)
    nombre        = Column(String, nullable=False, default="")
    apellido      = Column(String, nullable=False, default="")
    password_hash = Column(String, nullable=False)
    created_at    = Column(DateTime, default=datetime.datetime.utcnow)
    saved_searches = relationship("SavedSearch", back_populates="user", cascade="all, delete")
    alerts         = relationship("Alert",       back_populates="user", cascade="all, delete")


class SavedSearch(Base):
    __tablename__ = "saved_searches"
    id         = Column(Integer, primary_key=True)
    user_id    = Column(Integer, ForeignKey("users.id"), nullable=False)
    name       = Column(String, nullable=False)
    params     = Column(Text, nullable=False)   # JSON: {brand, model, year_from, ...sources}
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    user       = relationship("User", back_populates="saved_searches")


class Alert(Base):
    __tablename__ = "alerts"
    id            = Column(Integer, primary_key=True)
    user_id       = Column(Integer, ForeignKey("users.id"), nullable=False)
    name          = Column(String, nullable=False)
    params        = Column(Text, nullable=False)   # JSON search params
    active        = Column(Boolean, default=True)
    last_run      = Column(DateTime, nullable=True)
    last_seen_ids = Column(Text, default="[]")     # JSON array of car IDs
    created_at    = Column(DateTime, default=datetime.datetime.utcnow)
    user          = relationship("User", back_populates="alerts")


def init_db():
    Base.metadata.create_all(bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
