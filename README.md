[![Review Assignment Due Date](https://classroom.github.com/assets/deadline-readme-button-22041afd0340ce965d47ae6ef1cefeee28c7c493a6346c4f15d667ab976d596c.svg)](https://classroom.github.com/a/ULL36zWV)
### Estructura del projecte

A diferència d’altres projectes més complexos, en aquest cas **treballareu amb una estructura simple**, igual que a l’exemple oficial. Tot el backend s’ubica en un únic fitxer (`app.py`), amb l’objectiu de centrar-se en **aprendre CRUD amb FastAPI i MongoDB** abans de **modularitzar el codi**.

El projecte ha de mantenir una **estructura com aquesta**:

```
project/
├── README.md
├── backend/                # FastAPI + MongoDB
│   ├── app.py              # Fitxer principal (tota la lògica)
│   └── requirements.txt    # Dependències
│
├── frontend/           # Interfície web
│   ├── index.html
│   ├── style.css
│   └── app.js
│
└── tests/              # Tests amb Postman
    └── Postman_API_tests.json
```
#### Fitxer `app.py`

En projectes més complexos, es separaria, per exemple, la connexió a MongoDB en un fitxer a banda, anomenat `database.py`; i, els models, en `models.py`.
En el nostre cas, tot el backend l'implementarem dins del fitxer `app.py` per simplificar.

Tot i això, és **molt recomanable**:
- Afegir **grans comentaris per separar lògica** de connexió, models i endpoints.
- **Documentar clarament cada secció** per facilitar la lectura i localització d’errors.

```python
import os
from typing import Optional, List
from fastapi import FastAPI, Body, HTTPException, status
from fastapi.responses import Response
from pydantic import ConfigDict, BaseModel, Field
from pydantic.functional_validators import BeforeValidator
from typing_extensions import Annotated
from bson import ObjectId
from pymongo import AsyncMongoClient, ReturnDocument
from fastapi.middleware.cors import CORSMiddleware

# ------------------------------------------------------------------------ #
#                          Inicialització de l'aplicació                   #
# ------------------------------------------------------------------------ #
app = FastAPI(
    title="Gestor de Tasques API",
    summary="API REST per gestionar tasques amb MongoDB",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ------------------------------------------------------------------------ #
#                    Configuració de la connexió amb MongoDB               #
# ------------------------------------------------------------------------ #
client = AsyncMongoClient("mongodb+srv://cristianchanclon_db_user:1234@cluster0.n42t6zw.mongodb.net/college?retryWrites=true&w=majority&appName=Cluster0")
db = client.college
task_collection = db.get_collection("tasques")

PyObjectId = Annotated[str, BeforeValidator(str)]

# ------------------------------------------------------------------------ #
#                             Definició dels models                        #
# ------------------------------------------------------------------------ #
class GestorTasquesModel(BaseModel):
    """
    Model que representa una tasca.
    """
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    titol: str = Field(...)
    descripcio: str = Field(...)
    estat: str = Field(default="pendent")
    prioritat: int = Field(..., ge=1, le=5)
    categoria: str = Field(...)
    persona_assignada: str = Field(...)

    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        json_schema_extra={
            "example": {
                "titol": "Exemple de tasca",
                "descripcio": "Descripció detallada",
                "estat": "pendent",
                "prioritat": 3,
                "categoria": "General",
                "persona_assignada": "Cristian"
            }
        },
    )

# ------------------------------------------------------------------------ #
#                               Endpoints CRUD                             #
# ------------------------------------------------------------------------ #

@app.post("/tasks/", response_model=GestorTasquesModel, status_code=status.HTTP_201_CREATED)
async def create_task(task: GestorTasquesModel = Body(...)):
    new_task = await task_collection.insert_one(
        task.model_dump(by_alias=True, exclude={"id"})
    )
    created_task = await task_collection.find_one({"_id": new_task.inserted_id})
    return created_task

@app.get("/tasks/", response_model=List[GestorTasquesModel])
async def list_tasks():
    return await task_collection.find().to_list(1000)

@app.get("/tasks/{id}", response_model=GestorTasquesModel)
async def show_task(id: str):
    if (task := await task_collection.find_one({"_id": ObjectId(id)})) is not None:
        return task
    raise HTTPException(status_code=404, detail=f"Tasca {id} no trobada")

@app.put("/tasks/{id}", response_model=GestorTasquesModel)
async def update_task(id: str, task: GestorTasquesModel = Body(...)):
    update_data = {k: v for k, v in task.model_dump(by_alias=True).items() if k != "_id"}
    updated_task = await task_collection.find_one_and_update(
        {"_id": ObjectId(id)},
        {"$set": update_data},
        return_document=ReturnDocument.AFTER,
    )
    if updated_task:
        return updated_task
    raise HTTPException(status_code=404, detail=f"Tasca {id} no trobada")

@app.delete("/tasks/{id}")
async def delete_task(id: str):
    delete_result = await task_collection.delete_one({"_id": ObjectId(id)})
    if delete_result.deleted_count == 1:
        return Response(status_code=status.HTTP_204_NO_CONTENT)
    raise HTTPException(status_code=404, detail=f"Tasca {id} no trobada")

