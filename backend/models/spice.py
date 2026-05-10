from sqlalchemy import Column, Integer, String, Text, Float, ForeignKey
from sqlalchemy.orm import relationship
from database import Base


class Spice(Base):
    __tablename__ = "spices"

    id = Column(Integer, primary_key=True)
    name = Column(String(200), nullable=False, unique=True)
    description = Column(Text)
    history = Column(Text)
    origin = Column(String(200))
    photo_url = Column(String(500))
    storage_tips = Column(Text)
    substitutes = Column(Text)

    nutrition = relationship("SpiceNutrition", back_populates="spice", cascade="all, delete-orphan")
    combos_a = relationship("SpiceCombo", foreign_keys="SpiceCombo.spice_id_1", back_populates="spice_a")
    combos_b = relationship("SpiceCombo", foreign_keys="SpiceCombo.spice_id_2", back_populates="spice_b")


class SpiceNutrition(Base):
    __tablename__ = "spice_nutrition"

    id = Column(Integer, primary_key=True)
    spice_id = Column(Integer, ForeignKey("spices.id", ondelete="CASCADE"))
    element = Column(String(100))   # железо, кальций, магний, etc.
    amount_per_5g = Column(Float)
    unit = Column(String(20))

    spice = relationship("Spice", back_populates="nutrition")


class SpiceCombo(Base):
    __tablename__ = "spice_combos"

    id = Column(Integer, primary_key=True)
    spice_id_1 = Column(Integer, ForeignKey("spices.id"))
    spice_id_2 = Column(Integer, ForeignKey("spices.id"))
    score = Column(Float)       # 0–10 совместимость
    notes = Column(Text)

    spice_a = relationship("Spice", foreign_keys=[spice_id_1], back_populates="combos_a")
    spice_b = relationship("Spice", foreign_keys=[spice_id_2], back_populates="combos_b")
