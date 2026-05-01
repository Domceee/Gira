from sqlalchemy import Column, ForeignKey, Integer
from app.db.base_class import Base


class task_multiple_assignees(Base):
    __tablename__ = "task_multiple_assignees"


    id_task_multiple_assignees = Column(Integer, primary_key=True, index=True)
    fk_userid_user= Column(
        Integer,
        ForeignKey("users.id_user"),
        nullable=False,
    )    

    fk_taskid_task= Column(
        Integer,
        ForeignKey("task.id_task"),
        nullable=False,
    )


