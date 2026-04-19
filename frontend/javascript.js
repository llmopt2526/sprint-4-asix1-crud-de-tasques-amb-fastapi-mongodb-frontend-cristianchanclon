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
