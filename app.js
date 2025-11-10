// Variable global para almacenar todos los gastos
let gastos = [];

// Constante de Moneda y Código (Quetzal Guatemalteco)
const MONEDA_CODIGO = 'GTQ';
const MONEDA_SIMBOLO = 'Q';

// 1. Obtener referencias a los elementos del DOM
const gastoForm = document.getElementById('gasto-form');
const gastosListaDiv = document.getElementById('gastos-lista');
const analizarBtn = document.getElementById('analizar-btn');
const consejoIaDiv = document.getElementById('consejo-ia');
const reiniciarBtn = document.getElementById('reiniciar-btn');

// --- Lógica de Almacenamiento ---

function cargarGastos() {
    const gastosGuardados = localStorage.getItem('gastosCoachIA');
    if (gastosGuardados) {
        gastos = JSON.parse(gastosGuardados);
    }
    mostrarGastos();
}

function guardarGastos() {
    localStorage.setItem('gastosCoachIA', JSON.stringify(gastos));
}

// --- Lógica de la Interfaz (Mostrar) ---

function mostrarGastos() {
    gastosListaDiv.innerHTML = '';
    consejoIaDiv.innerHTML = '';
    
    if (gastos.length === 0) {
        gastosListaDiv.innerHTML = '<p style="text-align: center; color: #64748b;">Aún no hay gastos registrados. ¡Empieza a registrar para recibir consejos!</p>';
        analizarBtn.disabled = true;
        return;
    }

    gastos.forEach((gasto, index) => {
        const item = document.createElement('div');
        item.classList.add('gasto-item');
        
        // CAMBIO DE DIVISA: Formatear a Quetzales GTQ
        const montoFormateado = new Intl.NumberFormat('es-GT', { 
            style: 'currency', 
            currency: MONEDA_CODIGO
        }).format(gasto.monto);

        item.innerHTML = `
            <div class="gasto-detalle">
                <strong>${gasto.categoria}</strong>
                <span class="gasto-nota">${gasto.nota}</span>
            </div>
            <span class="gasto-monto">${montoFormateado}</span>
        `;
        
        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = 'X';
        deleteBtn.style.cssText = 'width: 30px; height: 30px; padding: 0; margin-left: 15px; background-color: #ef4444; color: white; border-radius: 50%; font-size: 0.7em; border: none; flex-shrink: 0;';
        deleteBtn.onclick = () => eliminarGasto(index);

        item.appendChild(deleteBtn);
        gastosListaDiv.appendChild(item);
    });

    analizarBtn.disabled = false;
}

// --- Lógica de Formulario ---

function agregarGasto(e) {
    e.preventDefault(); 
    
    const monto = parseFloat(document.getElementById('monto').value);
    const categoria = document.getElementById('categoria').value;
    const nota = document.getElementById('nota').value.trim();

    if (monto && categoria && nota) {
        const nuevoGasto = {
            monto: monto,
            categoria: categoria,
            nota: nota,
            fecha: new Date().toISOString()
        };

        gastos.push(nuevoGasto);
        guardarGastos();
        mostrarGastos();

        gastoForm.reset();
    } else {
        alert('Por favor, completa todos los campos.');
    }
}

function eliminarGasto(index) {
    if (confirm("¿Estás seguro de eliminar este gasto?")) {
        gastos.splice(index, 1);
        guardarGastos();
        mostrarGastos();
    }
}

// --- Lógica CENTRAL de la IA (Conexión Real a Gemini) ---

async function analizarGastos() {
    if (gastos.length === 0) {
        consejoIaDiv.innerHTML = 'Registra al menos un gasto para recibir tu primer consejo.';
        return;
    }

    // Verificar si la clave API existe (es definida en index.html)
    if (typeof GEMINI_API_KEY === 'undefined' || GEMINI_API_KEY === 'TU_CLAVE_GEMINI_AQUI') {
        consejoIaDiv.innerHTML = 'ERROR: No se ha configurado la GEMINI_API_KEY. Por favor, revisa tu archivo index.html.';
        return;
    }

    consejoIaDiv.innerHTML = 'Analizando tus patrones con Gemini...';
    analizarBtn.disabled = true;

    // 1. Agrupar gastos para el análisis
    const resumen = gastos.reduce((acc, gasto) => {
        if (!acc[gasto.categoria]) {
            acc[gasto.categoria] = { total: 0, notas: [] };
        }
        acc[gasto.categoria].total += gasto.monto;
        acc[gasto.categoria].notas.push(gasto.nota);
        return acc;
    }, {});
    
    // Convertir el resumen a un formato legible para la IA
    const resumenTexto = Object.entries(resumen).map(([cat, data]) => 
        `Categoría: ${cat} | Total: ${MONEDA_SIMBOLO}${data.total.toFixed(2)} | Notas: [${data.notas.join(', ')}]`
    ).join('\n');
    
    const totalGastado = gastos.reduce((sum, g) => sum + g.monto, 0).toFixed(2);

    // 2. Crear el PROMPT (Instrucciones para la IA)
    const prompt = `
        Eres un Coach de Finanzas Conductual experto y empático. Tu objetivo es analizar la tabla de gastos semanales proporcionada y ofrecer un consejo único.
        
        Datos de Gasto Semanal (en Quetzales - GTQ):
        Total Gastado: ${MONEDA_SIMBOLO}${totalGastado}
        
        Detalle de Gastos:
        ${resumenTexto}

        Instrucciones para la Respuesta:
        1. Identifica el principal patrón de gasto conductual (ej. Gasto por Aburrimiento, Gasto por Convivencia, Falta de Planificación, etc.) o la categoría de mayor riesgo.
        2. Escribe una respuesta en Español que comience con: "**¡El Coach Gemini te aconseja!**"
        3. Escribe un párrafo reconociendo el patrón o la categoría principal.
        4. Ofrece un **único consejo** práctico y concreto para modificar ese comportamiento esta semana.
        5. **Formato:** Usa negritas (**) para resaltar el patrón y el consejo. No uses títulos ni listas, solo texto plano y enfocado.
    `;
    
    // 3. Conexión a la API de Gemini (Proxy service para evitar exponer la API Key)
    // NOTA: Usar un proxy service o un backend simple es la práctica más segura. 
    // Para simplificar el proyecto de portafolio, usaremos la llamada directa.
    
    const model = 'gemini-2.5-flash';
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
                config: {
                    // Ajustamos la temperatura para tener respuestas más creativas y de coach
                    temperature: 0.8
                }
            })
        });

        if (!response.ok) {
            throw new Error(`Error de API: ${response.statusText}`);
        }

        const data = await response.json();
        const consejoReal = data.candidates[0]?.content?.parts[0]?.text || 'No se pudo generar un consejo, intenta de nuevo.';
        
        consejoIaDiv.innerHTML = consejoReal;

    } catch (error) {
        console.error("Error al conectar con Gemini:", error);
        consejoIaDiv.innerHTML = `Error: No se pudo contactar al Coach. Revisa la consola y tu clave API. (${error.message})`;
    } finally {
        analizarBtn.disabled = false;
    }
}

// --- Lógica de Reinicio ---
function reiniciarDatos() {
    if (confirm("¿Estás seguro de que quieres borrar TODOS los gastos? Esta acción no se puede deshacer.")) {
        localStorage.removeItem('gastosCoachIA');
        gastos = [];
        mostrarGastos();
        alert("¡Datos semanales reiniciados! Puedes empezar de nuevo.");
    }
}


// --- 2. Event Listeners ---
gastoForm.addEventListener('submit', agregarGasto);
analizarBtn.addEventListener('click', analizarGastos);
reiniciarBtn.addEventListener('click', reiniciarDatos); 

// Cargar los gastos al cargar la página
document.addEventListener('DOMContentLoaded', cargarGastos);