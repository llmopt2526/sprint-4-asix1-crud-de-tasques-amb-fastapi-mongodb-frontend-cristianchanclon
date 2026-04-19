1. Backend app.py

Aquest fitxer és el cervell. Fes servir Body per rebre actualitzacions i await per assegurar que MongoDB guardi els canvis abans de respondre.


4. import os
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

from fastapi import Body

@app.put("/tasks/{task_id}")
async def update_task(task_id: str, payload: dict = Body(...)):
    # Añadimos 'await' antes de db.tasks...
    result = await db.tasks.update_one(
        {"_id": ObjectId(task_id)},
        {"$set": payload}
    )
    if result.matched_count == 0:
        return {"message": "No se encontró la tarea"}
    return {"message": "Tarea actualizada correctamente"}

@app.delete("/tasks/{id}")
async def delete_task(id: str):
    delete_result = await task_collection.delete_one({"_id": ObjectId(id)})
    if delete_result.deleted_count == 1:
        return Response(status_code=status.HTTP_204_NO_CONTENT)
    raise HTTPException(status_code=404, detail=f"Tasca {id} no trobada")



    

2. Frontend tenim javascript.js

Aquest arxiu és essencial ja que és el que s'encarrega de poder manejar ja web

   const API_URL = "http://127.0.0.1:8000/tasks/";

// Función para obtener y mostrar las tareas
async function getTasks() {
    try {
        const response = await fetch(API_URL);
        const tasks = await response.json();
        const list = document.getElementById('tasks-list');
        list.innerHTML = ''; 

        tasks.forEach(task => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><strong>${task.titol}</strong><br><small>${task.descripcio || ''}</small></td>
                <td>${task.estat}</td>
                <td>${task.prioritat}</td>
                <td>${task.persona_assignada}</td>
                <td>
                    <button class="button" onclick="updateTask('${task._id}', 'finalizado')" 
                        style="color: green; border-color: green; margin-right: 5px;">Fet</button>
                    
                    <button class="button" onclick="deleteTask('${task._id}')" 
                        style="color: red; border-color: red;">Eliminar</button>
                </td>
            `;
            list.appendChild(row);
        });
    } catch (error) {
        console.error("Error carregant tasques:", error);
    }
}

// Función para crear una nueva tarea (POST)
document.getElementById('task-form').onsubmit = async (e) => {
    e.preventDefault();
    
    const newTask = {
        titol: document.getElementById('titol').value,
        descripcio: document.getElementById('descripcio').value,
        persona_assignada: document.getElementById('persona').value,
        prioritat: parseInt(document.getElementById('prioritat').value),
        categoria: document.getElementById('categoria').value,
        estat: document.getElementById('estat').value
    };

    await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTask)
    });

    document.getElementById('task-form').reset();
    getTasks(); 
};

// Función para eliminar (DELETE)
async function deleteTask(id) {
    if (confirm('Segur que vols eliminar aquesta tasca?')) {
        await fetch(`${API_URL}${id}`, { method: 'DELETE' });
        getTasks();
    }
}

// Función para actualizar el estado (PUT)
async function updateTask(id, nuevoEstado) {
    try {
        const response = await fetch(`${API_URL}${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ estat: nuevoEstado })
        });

        if (response.ok) {
            // Esto es lo más importante: 
            // Vaciamos la lista y volvemos a llamar a getTasks()
            console.log("Actualizado con éxito");
            await getTasks(); 
        }
    } catch (error) {
        console.error("Error en el PUT:", error);
    }
}

// Carga inicial al abrir la página
getTasks();

3. Comandes d'Execució

Perquè tot funcioni utilitzarem l'ordre uvicorn app:app --reload perquè la nostra fast api funcioni.
<img width="928" height="253" alt="image" src="https://github.com/user-attachments/assets/88bfcb65-ef76-4612-8512-3c8d7cbe9e53" />

el següent que farem serà obrir la nostra pàgina per fer el funcionament

<img width="886" height="762" alt="image" src="https://github.com/user-attachments/assets/4d898703-961b-4f2b-bc4e-7d1be9aa4ffb" />

i posarem unes dades per comprovar-ne el funcionament
<img width="834" height="746" alt="image" src="https://github.com/user-attachments/assets/7ce2f9ac-1cd7-4be3-b7d9-2d36d0c1aa7e" />

<img width="715" height="60" alt="image" src="https://github.com/user-attachments/assets/7c3b8422-07d3-40e5-b4b8-4aa3bd6926a8" />

i si volem eliminar-lo de donarem a eliminar i llest
<img width="1853" height="1010" alt="image" src="https://github.com/user-attachments/assets/83ca1547-594c-4c23-b7d8-e195fd222872" />

ara provarem de fer un get en postman per comprovar-ne el funcionament
<img width="1067" height="681" alt="image" src="https://github.com/user-attachments/assets/a16b17ea-8479-40f0-84a0-a1e019711f67" />
