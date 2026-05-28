const API_URL = "https://microgest-production.up.railway.app";
let ingresoEditandoId = null;
let rangoGrafica = "1m";
let sucursalActual = 1;
let modoFiltro = false;
let paginaActual = 1;
let totalPaginas = 1;
let btnPrev, btnNext, btnPrimero, btnUltimo;
let seccionActual = 'dashboard';
let eliminadosAbierto = false;
window.filtrosActivos = null;
let paginaEliminadosIngresos = 1;
let paginaEliminadosGastos = 1;
let totalPaginasEliminadosIngresos = 1;
let totalPaginasEliminadosGastos = 1;
let filtrosEliminadosIngresos = {};
let filtrosEliminadosGastos = {};
let modoVista = "mes";



document.addEventListener('DOMContentLoaded', () => {

    console.log("La página de gestión de ingresos está funcionando");

    seccionActual = 'dashboard';

    const tipoFiltroReporte = document.getElementById('tipoFiltroReporte');

    if (tipoFiltroReporte) {
        tipoFiltroReporte.addEventListener('change', () => {

            const tipo = tipoFiltroReporte.value;
            const contenedor = document.getElementById('inputReporte');

            contenedor.innerHTML = '';

            // ===== TIPO =====
            if (tipo === 'tipo') {

                contenedor.innerHTML = `<select id="valorReporte"></select>`;

                setTimeout(() => {
                    cargarTiposEnFiltroReporte();
                }, 0);
            }

            // ===== MONTO =====
            else if (tipo === 'monto') {
                contenedor.innerHTML = `
                    <input type="number" id="valorReporte" placeholder="Ej: 50000">
                `;
            }

            // ===== DESCRIPCIÓN =====
            else if (tipo === 'descripcion') {
                contenedor.innerHTML = `
                    <input type="text" id="valorReporte" placeholder="Ej: venta">
                    <label style="margin-left:10px;">
                        <input type="checkbox" id="sinDescripcionReporte"> Sin descripción
                    </label>
                `;

                const checkbox = document.getElementById('sinDescripcionReporte');
                const input = document.getElementById('valorReporte');

                checkbox.addEventListener('change', () => {
                    input.style.display = checkbox.checked ? 'none' : 'inline';
                });
            }

            // ===== FECHA =====
            else if (tipo === 'fecha') {

                contenedor.innerHTML = `
                    <div class="grupo-fecha">
                        <label>Desde</label>
                        <input type="date" id="fechaInicio">

                        <label>Hasta</label>
                        <input type="date" id="fechaFin">
                    </div>
                `;
            }

        });
    }

    const passwordInput = document.getElementById("passwordReg");
    const btnRegistrar = document.querySelector('#btnRegistrar');

    if (passwordInput && btnRegistrar) {
        passwordInput.addEventListener("input", () => {
            btnRegistrar.disabled = !validarPassword(passwordInput.value);
        });
    }


    if (passwordInput) {
        passwordInput.addEventListener("input", () => {

            const value = passwordInput.value;

            document.getElementById("rule-length")
                .classList.toggle("ok", value.length >= 8);

            document.getElementById("rule-upper")
                .classList.toggle("ok", /[A-Z]/.test(value));

            document.getElementById("rule-lower")
                .classList.toggle("ok", /[a-z]/.test(value));

            document.getElementById("rule-number")
                .classList.toggle("ok", /\d/.test(value));

            document.getElementById("rule-symbol")
                .classList.toggle("ok", /[\W_]/.test(value));
        });
    }

    async function validarSesion() {
        const token = localStorage.getItem('token');
        return !!token;
    }

        
    const modal = document.getElementById("modal");

    if (modal) {
        modal.addEventListener("click", (e) => {
            if (e.target === modal) {
                cerrarModal();
            }
        });
    }

    const tipoFiltro = document.getElementById('tipoFiltro');

    const tipoFiltroGastos = document.getElementById('tipoFiltroGastos');

    if (tipoFiltroGastos) {
        tipoFiltroGastos.addEventListener('change', () => {

            paginaEliminadosGastos = 1;
            filtrosEliminadosGastos = {};


            const tipo = tipoFiltroGastos.value;
            const contenedor = document.getElementById('inputFiltroGastos');

            contenedor.innerHTML = '';

            if (tipo === 'tipo') {

                contenedor.innerHTML = `<select id="valorFiltroGastos"></select>`;

                setTimeout(() => {
                    cargarTiposEnFiltroGastos();
                }, 0);

            }

            else if (tipo === 'monto') {
                contenedor.innerHTML = `<input type="number" id="valorFiltroGastos" placeholder="Ej: 50000">`;
            }

            else if (tipo === 'descripcion') {
                contenedor.innerHTML = `
                    <input type="text" id="valorFiltroGastos" placeholder="Ej: gasto">
                    <label>
                        <input type="checkbox" id="sinDescripcionGastos"> Sin descripción
                    </label>
                `;
            }

            else if (tipo === 'fecha') {
                contenedor.innerHTML = `
                    <div class="grupo-fecha">
                        <select id="modoFechaGastos">
                            <option value="dia">Día específico</option>
                            <option value="mes">Mes</option>
                            <option value="anio">Año</option>
                            <option value="rango">Rango de fechas</option>
                        </select>
                        <div id="inputFechaGastos"></div>
                    </div>
                `;

                const modoSelect = document.getElementById('modoFechaGastos');

                modoSelect.addEventListener('change', (e) => {
                    const modo = e.target.value;
                    const input = document.getElementById('inputFechaGastos');

                    if (modo === 'dia') {
                        input.innerHTML = `<input type="date" id="valorFiltroGastos">`;
                    }

                    else if (modo === 'mes') {
                        input.innerHTML = `<input type="month" id="valorFiltroGastos">`;
                    }

                    else if (modo === 'anio') {
                        input.innerHTML = `<input type="number" id="valorFiltroGastos">`;
                    }

                    else if (modo === 'rango') {
                        input.innerHTML = `
                            <div class="grupo-fecha">
                                <label>Desde</label>
                                <input type="date" id="fechaInicio">

                                <label>Hasta</label>
                                <input type="date" id="fechaFin">
                            </div>
                        `;
                    }
                });

                modoSelect.dispatchEvent(new Event('change'));
            }
        });
    }

    const btnAplicarFiltro = document.getElementById('btnAplicarFiltro');

    if (btnAplicarFiltro) {
        btnAplicarFiltro.addEventListener('click', async () => {

            modoFiltro = true;

            const tipoFiltro = document.getElementById('tipoFiltro').value;
            const valor = document.getElementById('valorFiltro')?.value;
            const sinDesc = document.getElementById('sinDescripcion')?.checked;

            const params = new URLSearchParams();
            if (modoVista === "mes") {
                params.append('mes', obtenerMesActual());
            }

            paginaActual = 1;
            params.append('page', 1);

            if (
                tipoFiltro !== 'descripcion' &&
                !(tipoFiltro === 'fecha' && document.getElementById('modoFecha')?.value === 'rango') &&
                !valor
            ) {
                mostrarModal("error", "Error", "Selecciona un valor válido");
                return;
            }

            if (tipoFiltro === 'tipo') params.append('tipo', valor);
            if (tipoFiltro === 'monto') params.append('monto', valor);

            if (tipoFiltro === 'descripcion') {
                if (sinDesc) params.append('sinDescripcion', 'true');
                else params.append('descripcion', valor);
            }

            if (tipoFiltro === 'fecha') {
                const modo = document.getElementById('modoFecha')?.value;

                if (modo === 'dia') params.append('fecha', valor);
                if (modo === 'mes') params.append('mes', valor);
                if (modo === 'anio') params.append('anio', valor);

                if (modo === 'rango') {
                    const inicio = document.getElementById('fechaInicio').value;
                    const fin = document.getElementById('fechaFin').value;

                    params.append('fechaInicio', inicio);
                    params.append('fechaFin', fin);
                }
            }

            window.filtrosActivos = Object.fromEntries(params.entries());
            delete window.filtrosActivos.page;

            let url = `${API_URL}/movimientos?` + params.toString();
            url += '&categoria=ingreso';

            const data = await fetchConToken(url);

            pintarTabla(data.datos);

            paginaActual = data.pagina;
            totalPaginas = data.totalPaginas;

            document.getElementById('contadorIngresos').textContent =
                `${data.total ?? 0} ingresos`;

            actualizarPaginacion();
            cargarSumaTotal(window.filtrosActivos);
            cargarGraficaDonaIngresos();
        });
    }

    if (tipoFiltro) {
        tipoFiltro.addEventListener('change', () => {

        
        // ✅ LIMPIAR PAGINACIÓN Y FILTROS
        paginaEliminadosIngresos = 1;
        filtrosEliminadosIngresos = {};


        const tipo = document.getElementById('tipoFiltro').value;
        const contenedor = document.getElementById('inputFiltro');

        contenedor.innerHTML = '';

        if (tipo === 'tipo') {
            contenedor.innerHTML = `<select id="valorFiltro"></select>`;
            cargarTiposEnFiltro();
        }

        else if (tipo === 'monto') {
            contenedor.innerHTML = `<input type="number" id="valorFiltro" placeholder="Ej: 50000">`;
        }

        else if (tipo === 'descripcion') {
            contenedor.innerHTML = `
                <input type="text" id="valorFiltro" placeholder="Ej: ventas">
                <label style="margin-left:10px;">
                    <input type="checkbox" id="sinDescripcion"> Sin descripción
                </label>
            `;

            const checkbox = document.getElementById('sinDescripcion');
            const input = document.getElementById('valorFiltro');

            checkbox.addEventListener('change', () => {
                if (checkbox.checked) {
                    input.style.display = 'none';
                } else {
                    input.style.display = 'inline';
                }
            });
        }

        else if (tipo === 'fecha') {

            contenedor.innerHTML = `
                <div class="grupo-fecha">
                    <select id="modoFecha">
                        <option value="dia">Día específico</option>
                        <option value="mes">Mes</option>
                        <option value="anio">Año</option>
                        <option value="rango">Rango de fechas</option>
                    </select>
                    <div id="inputFecha"></div>
                </div>
            `;

            const modoSelect = document.getElementById('modoFecha');

            modoSelect.addEventListener('change', (e) => {
                const modo = e.target.value;
                const input = document.getElementById('inputFecha');

                if (modo === 'dia') {
                    input.innerHTML = `<input type="date" id="valorFiltro">`;
                }

                else if (modo === 'mes') {
                    input.innerHTML = `<input type="month" id="valorFiltro">`;
                }

                else if (modo === 'anio') {
                    input.innerHTML = `<input type="number" id="valorFiltro" placeholder="Ej: 2026">`;
                }

                else if (modo === 'rango') {
                    input.innerHTML = `
                        <div class="grupo-fecha">
                            <label>Desde</label>
                            <input type="date" id="fechaInicio">

                            <label>Hasta</label>
                            <input type="date" id="fechaFin">
                        </div>
                    `;
                }
            });

            modoSelect.dispatchEvent(new Event('change'));
        }


    })};


    const toggleIngreso = document.getElementById('toggleFechaIngreso');
    const contIngreso = document.getElementById('fechaIngresoContainer');

    if (toggleIngreso && contIngreso) {
        toggleIngreso.addEventListener('change', () => {
            contIngreso.style.display = toggleIngreso.checked ? 'block' : 'none';
        });
    }

    const toggleGasto = document.getElementById('toggleFechaGasto');
    const contGasto = document.getElementById('fechaGastoContainer');

    if (toggleGasto && contGasto) {
        toggleGasto.addEventListener('change', () => {
            contGasto.style.display = toggleGasto.checked ? 'block' : 'none';
        });
    }

    const formGasto = document.getElementById('formGasto');

    if (formGasto) {
        formGasto.addEventListener('submit', async (e) => {
            e.preventDefault();

            const fechaInput = document.getElementById('fechaGasto');

            const fechaFinal = fechaInput && fechaInput.value
                ? fechaInput.value
                : obtenerFechaLocal();

            const gasto = {
                fecha: fechaFinal,
                monto: document.getElementById('montoGasto').value,
                descripcion: document.getElementById('descripcionGasto').value,
                tipo_id: document.getElementById('tipoGasto').value,
                categoria: 'gasto'
            };

            try {
                const data = await fetchConToken(`${API_URL}/movimientos`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(gasto)
                });

                mostrarModal("success", "Proceso exitoso", data.message);

                formGasto.reset();

                // sincronizar toggle
                const toggle = document.getElementById('toggleFechaGasto');
                const cont = document.getElementById('fechaGastoContainer');

                if (toggle && cont) {
                    toggle.checked = false;
                    cont.style.display = 'none';
                }

                refrescarDashboard();
                cargarGastosPaginados();

            } catch (error) {
                console.error(error);
                mostrarModal("error", "Error", "Error al guardar gasto");
            }
        });
    }


    const btnFiltrosGastos = document.getElementById('btnFiltrosGastos');

    if (btnFiltrosGastos) {btnFiltrosGastos.addEventListener('click', () => {

        const panel = document.getElementById('panelFiltrosGastos');

        if (panel.style.display === 'block') {

            panel.style.display = 'none';

            modoFiltro = false;
            window.filtrosActivos = null;

            paginaActual = 1;
            cargarGastosPaginados(1);
            cargarSumaTotalGastos();

        } else {

            panel.style.display = 'block';
        }
    });};


        
    const btnEliminarMeta = document.getElementById('eliminarMeta');

    if (btnEliminarMeta) {
        btnEliminarMeta.addEventListener('click', async () => {

            try {
                const data = await fetchConToken(`${API_URL}/meta`, {
                    method: 'DELETE'
                });

                mostrarModal("success", "Meta eliminada", data.message);

                document.getElementById('metaMensual').value = '';

                await cargarMeta();

            } catch (error) {
                console.error(error);
                mostrarModal("error", "Error", "No se pudo eliminar la meta");
            }

        });
    }

    function obtenerFechaLocal() {
        const hoy = new Date();
        return hoy.getFullYear() + '-' +
            String(hoy.getMonth() + 1).padStart(2, '0') + '-' +
            String(hoy.getDate()).padStart(2, '0');
    }


    // ===============================
    // CREAR INGRESO (POST)
    // ===============================
    const form = document.getElementById('formIngreso');

    if (form) {
    form.addEventListener('submit', async (event) => {

        event.preventDefault();

        console.log(document.getElementById('tipo'));

        const tipoInput = event.target.querySelector('#tipo');

        if (!tipoInput) {
            console.error("No se encontró el select de tipo dentro del form");
            mostrarModal("error", "Error", "El campo tipo no esta disponible. Recarga la página e intenta de nuevo.");
            return;
        }


        const fechaInput = event.target.querySelector('#fecha');

        const fechaFinal = fechaInput && fechaInput.value
            ? fechaInput.value
            : obtenerFechaLocal();

        const ingreso = {
            fecha: fechaFinal,
            monto: event.target.querySelector('#monto').value,
            descripcion: event.target.querySelector('#descripcion').value,
            tipo_id: tipoInput.value,
            categoria: 'ingreso'
        };



        try {
            const data = await fetchConToken(`${API_URL}/movimientos`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(ingreso)
            });

            mostrarModal("success", "Proceso exitoso", data.message);
            form.reset();
            
            const toggle = document.getElementById('toggleFechaIngreso');
            const cont = document.getElementById('fechaIngresoContainer');

            if (toggle && cont) {
                toggle.checked = false;
                cont.style.display = 'none';
            }

            cargarTiposPorCategoria('ingreso', 'tipo');         
            refrescarDashboard();
            cargarIngresosPaginados();
            

        } catch (error) {
            console.error('Error:', error);
            mostrarModal("error", "Error", "No se pudo guardar el ingreso");
        }
    })};

    // ===============================
    // GUARDAR EDICIÓN (PUT)
    // ===============================

    
    const formEditar = document.getElementById('formEditar');

    if (formEditar) {
    formEditar.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!ingresoEditandoId) return;

        const selectTipo = document.getElementById('editTipo');

        const datos = {
            fecha: document.getElementById('editFecha').value,
            monto: document.getElementById('editMonto').value,
            descripcion: document.getElementById('editDescripcion').value,
            tipo_id: selectTipo ? selectTipo.value : null,
            categoria: 'ingreso'
        };

        // Validación correcta DESPUÉS de crear datos
            if (!datos.tipo_id) {
                mostrarModal("error", "Error", "Debes seleccionar un tipo");
                return;
            }

        try {
            const result = await fetchConToken(
                `${API_URL}/movimientos/${ingresoEditandoId}`,
                {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(datos)
                }
            );

            mostrarModal("success", "Proceso exitoso", result.message);

            cerrarEditor();

            // REFRESCAR TABLA (AQUÍ VA EXACTAMENTE)
            if (seccionActual === 'ingresos') {
                cargarIngresosPaginados(paginaActual);
            }

            refrescarDashboard();

        } catch (error) {
            console.error('Error al editar ingreso:', error);
            mostrarModal("error", "Error", "No se pudo editar el ingreso");
        }
    })};

    document.getElementById('formEditarGasto').addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!gastoEditandoId) return;

        const datos = {
            fecha: document.getElementById('editFechaGasto').value,
            monto: document.getElementById('editMontoGasto').value,
            descripcion: document.getElementById('editDescripcionGasto').value,
            tipo_id: document.getElementById('editTipoGasto').value,
            categoria: 'gasto'
        };

        try {
            const result = await fetchConToken(
                `${API_URL}/movimientos/${gastoEditandoId}`,
                {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(datos)
                }
            );

            mostrarModal("success", "Proceso exitoso", result.message);

            document.getElementById('panelEditarGasto').classList.add('oculto');
            gastoEditandoId = null;

            // RECARGA TABLA
            if (seccionActual === 'gastos') {
                cargarGastosPaginados(paginaActual);
            }

        } catch (error) {
            console.error(error);
            mostrarModal("error", "Error", "Error al editar gasto");
        }
    });
    // ===============================
    // CANCELAR EDICIÓN
    // ===============================
    const btnCancelar = document.getElementById('btnCancelar');

    if (btnCancelar) {
        btnCancelar.addEventListener('click', () => {
            cerrarEditor();
        });
    }

    document.getElementById('btnCancelarGasto').addEventListener('click', () => {
        document.getElementById('panelEditarGasto').classList.add('oculto');
        gastoEditandoId = null;
    });

    // ===============================
    // MODAL REPORTE
    // ===============================

    const modalReporte = document.getElementById('modalReporte');
    const btnExtracto = document.getElementById('btnExtracto');
    const btnCancelarReporte = document.getElementById('btnCancelarReporte');

    // ✅ FORZAR OCULTO AL INICIAR
    if (modalReporte) {
        modalReporte.classList.add('oculto');
    }

    // ✅ ABRIR MODAL
    if (btnExtracto && modalReporte) {
        btnExtracto.addEventListener('click', (e) => {
            e.stopPropagation();
            modalReporte.classList.remove('oculto');
            modalReporte.classList.add('activo');

        });
    }

    // ✅ CERRAR MODAL SOLO CON CANCELAR
    if (btnCancelarReporte && modalReporte) {
        btnCancelarReporte.addEventListener('click', () => {
            cerrarModalReporte();
        });
    }

    const btnEnviarReporte = document.getElementById('btnEnviarReporte');

    if (btnEnviarReporte) {
        btnEnviarReporte.addEventListener('click', async () => {

            const tipoFiltro = document.getElementById('tipoFiltroReporte').value;

            const params = new URLSearchParams();

            // ===== VALIDACIÓN BÁSICA
            if (!tipoFiltro) {
                return mostrarModal("error", "Error", "Selecciona un filtro");
            }

            // ===== TIPO
            if (tipoFiltro === 'tipo') {
                const valor = document.getElementById('valorReporte')?.value;

                if (!valor) {
                    return mostrarModal("error", "Error", "Selecciona un tipo");
                }

                params.append('tipo', valor);
            }

            // ===== MONTO
            if (tipoFiltro === 'monto') {
                const valor = document.getElementById('valorReporte')?.value;

                if (!valor) {
                    return mostrarModal("error", "Error", "Ingresa un monto");
                }

                params.append('monto', valor);
            }

            // ===== DESCRIPCIÓN
            if (tipoFiltro === 'descripcion') {

                const sinDesc = document.getElementById('sinDescripcionReporte')?.checked;
                const valor = document.getElementById('valorReporte')?.value;

                if (sinDesc) {
                    params.append('sinDescripcion', 'true');
                } else {
                    if (!valor) {
                        return mostrarModal("error", "Error", "Ingresa descripción");
                    }
                    params.append('descripcion', valor);
                }
            }

            // ===== FECHA
            if (tipoFiltro === 'fecha') {

                const fechaInicio = document.getElementById('fechaInicio')?.value;
                const fechaFin = document.getElementById('fechaFin')?.value;

                if (!fechaInicio || !fechaFin) {
                    return mostrarModal("error", "Error", "Selecciona un rango de fechas");
                }

                params.append('fechaInicio', fechaInicio);
                params.append('fechaFin', fechaFin);
            }

            // ===============================
            // ✅ LLAMADA AL BACKEND
            // ===============================
            try {

                const res = await fetch(
                    `${API_URL}/reporte?` + params.toString(),
                    {
                        headers: {
                            Authorization: 'Bearer ' + localStorage.getItem('token')
                        }
                    }
                );

                const data = await res.json();

                if (!res.ok) {
                    return mostrarModal("error", "Error", data.message);
                }

                // ✅ cerrar modal
                document.getElementById('modalReporte').classList.remove('activo');

                // ✅ feedback al usuario
                mostrarModal(
                    "success",
                    "Reporte enviado",
                    data.message
                );

            } catch (error) {
                console.error(error);
                mostrarModal("error", "Error", "No se pudo generar el reporte");
            }

        });
    }


    (async () => {

        const sesionValida = await validarSesion();

        if (!sesionValida) {

            localStorage.removeItem('token');
            localStorage.removeItem('usuarioEmail');

            document.getElementById('login').classList.remove('oculto');
            document.getElementById('navbar').classList.add('oculto');
            document.getElementById('app').classList.add('oculto');

        } else {

            document.getElementById('login').classList.add('oculto');
            document.getElementById('navbar').classList.remove('oculto');
            document.getElementById('app').classList.remove('oculto');

            mostrarSeccion('dashboard');
        }

    })();

    if (!btnRegistrar) return;

    btnRegistrar.addEventListener('click', async (e) => {
        e.preventDefault(); // 🔥 ESTO ES TODO

        const email = document.querySelector('#emailReg').value;
        const password = document.querySelector('#passwordReg').value;

        if (!email || !password) return;

        try {
            const res = await fetch(`${API_URL}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const data = await res.json();
            console.log(data);

            if (!res.ok) {
                return mostrarModal("error", "Error", data.message);
            }

            localStorage.removeItem('token');
            localStorage.removeItem('usuarioEmail');

            mostrarModal(
                "success",
                "Revisa tu correo",
                data.message
            );

            document.querySelector('#emailReg').value = '';
            document.querySelector('#passwordReg').value = '';

        } catch (error) {
        console.error(error);
        mostrarModal("error", "Error", error.message || "Error del servidor");
    }
    });



    
    cargarTiposPorCategoria('ingreso', 'tipo');
    cargarTiposPorCategoria('gasto', 'tipoGasto');
});

//eventos de paginacion
function configurarPaginacion() {

    if (seccionActual === 'ingresos') {
        btnPrev = document.getElementById('btnPrev');
        btnNext = document.getElementById('btnNext');
        btnPrimero = document.getElementById('btnPrimero');
        btnUltimo = document.getElementById('btnUltimo');
    }

    if (seccionActual === 'gastos') {
        btnPrev = document.getElementById('btnPrevGasto');
        btnNext = document.getElementById('btnNextGasto');
        btnPrimero = document.getElementById('btnPrimeroGasto');
        btnUltimo = document.getElementById('btnUltimoGasto');
    }

    if (!btnPrev || !btnNext || !btnPrimero || !btnUltimo) return;

    // EVENTOS CORRECTOS
    btnNext.onclick = () => {
        if (paginaActual < totalPaginas) {
            paginaActual++;
            modoFiltro ? aplicarFiltroConPagina(paginaActual)
                       : (seccionActual === 'gastos'
                          ? cargarGastosPaginados(paginaActual)
                          : cargarIngresosPaginados(paginaActual));
        }
    };

    btnPrev.onclick = () => {
        if (paginaActual > 1) {
            paginaActual--;
            modoFiltro ? aplicarFiltroConPagina(paginaActual)
                       : (seccionActual === 'gastos'
                          ? cargarGastosPaginados(paginaActual)
                          : cargarIngresosPaginados(paginaActual));
        }
    };

    btnPrimero.onclick = () => {
        paginaActual = 1;
        modoFiltro ? aplicarFiltroConPagina(1)
                   : (seccionActual === 'gastos'
                      ? cargarGastosPaginados(1)
                      : cargarIngresosPaginados(1));
    };

    btnUltimo.onclick = () => {
        paginaActual = totalPaginas;
        modoFiltro ? aplicarFiltroConPagina(totalPaginas)
                   : (seccionActual === 'gastos'
                      ? cargarGastosPaginados(totalPaginas)
                      : cargarIngresosPaginados(totalPaginas));
    };
}


// ===============================
// ELIMINAR INGRESO (DELETE)
// ===============================

async function eliminarIngreso(id) {

    mostrarModal("confirm", "Confirmación", "¿Seguro que deseas eliminar este ingreso?", async () => {

        try {
            const data = await fetchConToken(`${API_URL}/movimientos/${id}`, {
                method: 'DELETE'
            });

            mostrarModal("success", "Eliminado", data.message);

            if (seccionActual === 'ingresos') {
                cargarIngresosPaginados(paginaActual);
            }

            refrescarDashboard();

        } catch (error) {
            mostrarModal("error", "Error", "No se pudo eliminar el ingreso");
        }

    });

}


function eliminarGasto(id) {

    mostrarModal("confirm", "Confirmación", "¿Seguro que deseas eliminar este gasto?", async () => {

        try {
            const data = await fetchConToken(`${API_URL}/movimientos/${id}`, {
                method: 'DELETE'
            });

            mostrarModal("success", "Eliminado", data.message);

            if (seccionActual === 'gastos') {
                cargarGastosPaginados(paginaActual);
            }

        } catch (error) {
            mostrarModal("error", "Error", "No se pudo eliminar el gasto");
        }

    });

}



// ===============================
// ABRIR EDITOR FLOTANTE
// ===============================

function abrirEditor(id, fecha, monto, descripcion, tipo) {
    ingresoEditandoId = id;

    document.getElementById('editFecha').value = fecha.split('T')[0];
    document.getElementById('editMonto').value = monto;
    document.getElementById('editDescripcion').value = descripcion;

    cargarTiposPorCategoria('ingreso', 'editTipo');

    setTimeout(() => {
        document.getElementById('editTipo').value = tipo;
    }, 0);

    document.getElementById('panelEditar').classList.remove('oculto');
}


// ===============================
// CERRAR EDITOR FLOTANTE
// ===============================
function cerrarEditor() {
    ingresoEditandoId = null;
    document.getElementById('panelEditar').classList.add('oculto');
}


function formatearFecha(fechaISO) {
    if (!fechaISO) return '';
    return fechaISO.split('T')[0].split('-').reverse().join('/');
}

// ===============================
// RESUMEN FINANCIERO
// ===============================


async function cargarResumen() {
    try {
        const data = await fetchConToken(`${API_URL}/movimientos/resumen`);

        document.getElementById('totalHoy').textContent =
            formatoMoneda(data.ingresos_hoy || 0);

        document.getElementById('totalMes').textContent =
            formatoMoneda(data.ingresos_mes || 0);

        document.getElementById('totalMesAnterior').textContent =
            formatoMoneda(data.ingresos_mes_anterior || 0);
        
        document.getElementById('gastosMesAnterior').textContent =
            formatoMoneda(data.gastos_mes_anterior || 0);

        const variacionTexto = document.getElementById('variacionMensual');

        const variacion = Number(data.variacion || 0);


        if (variacion > 1000) {
            variacionTexto.textContent = '🚀 Crecimiento extremo';
        } else {
            variacionTexto.textContent = `${variacion.toFixed(2)}%`;
        }


        if (variacion > 0) {
            variacionTexto.style.color = '#16a34a';
        } else if (variacion < 0) {
            variacionTexto.style.color = '#dc2626';
        } else {
            variacionTexto.style.color = '#6b7280';
        }

        // GASTOS
        document.getElementById('gastosHoy').textContent =
            formatoMoneda(data.gastos_hoy || 0);

        document.getElementById('gastosMes').textContent =
            formatoMoneda(data.gastos_mes || 0);

        // BALANCE
        const balance = Number(data.balance || 0);
        const balanceElemento = document.getElementById('balanceMes');

        balanceElemento.textContent = formatoMoneda(balance);

        if (balance > 0) {
            balanceElemento.style.color = '#16a34a';
        } else if (balance < 0) {
            balanceElemento.style.color = '#dc2626';
        } else {
            balanceElemento.style.color = '#6b7280';
        }

        // ALERTA
        const alerta = document.getElementById('alertaFinanciera');

        if (variacion <= -20) {
            alerta.textContent = '⚠️ Los ingresos bajaron significativamente este mes';
            alerta.style.color = 'red';
        } else if (variacion > 0) {
            alerta.textContent = '✅ Los ingresos crecieron respecto al mes pasado';
            alerta.style.color = 'green';
        } else {
            alerta.textContent = '➖ No hay cambios significativos en los ingresos';
            alerta.style.color = 'gray';
        }

        cargarPromedioHistorico();

        const totalMes = data.ingresos_mes || 0;
        actualizarCerdito(totalMes, metaMensual);

    } catch (error) {
        console.error('Error al cargar resumen:', error);
    }
}


function actualizarCerdito(totalMes, meta) {

    const relleno = document.getElementById('rellenoCerdito');
    const mensaje = document.getElementById('mensajeMeta');
    const cerdito = document.querySelector('.alcancia-container');

    // SIN META
    if (!meta) {
        relleno.style.height = '0%';
        relleno.style.background = 'transparent';
        textoMeta.textContent = "$0";
        mensaje.textContent = "Define una meta para empezar 🚀";
        return;
    }

    const porcentaje = Math.min((totalMes / meta) * 100, 100);

    relleno.style.height = `${porcentaje}%`;

    // MOSTRAR META
    textoMeta.textContent = formatoMoneda(meta);

    // COLOR SUAVE
    const r = Math.max(0, Math.min(255, Math.round(255 - porcentaje * 2.5)));
    const g = Math.max(0, Math.min(255, Math.round(porcentaje * 2.5)));
    const b = 50;

    relleno.style.background = `rgb(${r},${g},${b})`;

    //  GLOW
    relleno.style.boxShadow = `0 0 ${porcentaje / 5}px rgba(0,255,100,0.4)`;

    //  MENSAJES
    if (porcentaje < 40) {
        mensaje.textContent = "Vamos, tú puedes 💪";
    } 
    else if (porcentaje < 80) {
        mensaje.textContent = "Vas muy bien 🔥";
    } 
    else if (porcentaje < 100) {
        mensaje.textContent = "Ya casi llegas 🚀";
    } 
    else {
        mensaje.textContent = "🎉 Meta alcanzada!";
    }

    // VIBRACIÓN
    if (porcentaje >= 100) {
        cerdito.classList.remove('meta-completa');
        void cerdito.offsetWidth;
        cerdito.classList.add('meta-completa');
    }
}

function refrescarDashboard() {
    cargarResumen();
    cargarGrafica();
    cargarIndicadores();
    cargarIndicadoresGastos();
}


let grafica = null; // ApexCharts instance

async function cargarGrafica() {


    if (seccionActual === 'especifico') return;

    const url = `${API_URL}/movimientos/por-dia?rango=${rangoGrafica}`;

    try {
        const data = await fetchConToken(url);

        if (!data || data.length === 0) {
            if (grafica) {
                grafica.destroy();
                grafica = null;
            }


            const chartEl = document.querySelector('#graficaIngresos');
            if (chartEl) {
                chartEl.innerHTML = "<p style='text-align:center;'>Sin datos</p>";
            }


            return;
        }

        const etiquetas = data.map(d => formatearFecha(d.fecha));
        
        const ingresos = data.map(d => d.ingresos);
        const gastos = data.map(d => d.gastos);


        if (grafica) grafica.destroy();

        const options = {
            chart: {
                type: 'area',
                height: '100%',
                width: '100%',
                parentHeightOffset: 0,
                toolbar: { show: false },
                zoom: { enabled: false },
                animations: {
                    enabled: true,
                    easing: 'easeinout',
                    speed: 800
                }
            },

            dataLabels: { enabled: false },

            series: [
            {
                name: 'Ingresos',
                data: ingresos
            },
            {
                name: 'Gastos',
                data: gastos
            }
            ],


            xaxis: {
                categories: etiquetas,
                tickAmount: 8,
                labels: {
                    show: false,
                    style: {
                        colors: 'var(--text-muted)',
                        fontSize: '11px'
                    }
                },
                axisBorder: { show: false },
                axisTicks: { show: false }
            },

            yaxis: {
                labels: {
                    formatter: val => formatoMoneda(val),
                    style: {
                        colors: 'var(--text-muted)',
                        fontSize: '11px'
                    }
                }
            },

            colors: ['#3b82f6', '#ef4444'], // azul y rojo

            stroke: {
                curve: 'smooth',
                width: 3
            },

            fill: {
                type: 'gradient',
                gradient: {
                    shadeIntensity: 0.35,
                    opacityFrom: 0.35,
                    opacityTo: 0.05,
                    stops: [0, 90, 100]
                }
            },

            grid: {
                borderColor: 'var(--border-soft)',
                strokeDashArray: 5
            },

            tooltip: {
                theme: 'dark',
                y: {
                    formatter: val => formatoMoneda(val)
                }
            }
        };

        grafica = new ApexCharts(
            document.querySelector('#graficaIngresos'),
            options
        );

        grafica.render();

    } catch (error) {
        console.error('Error al cargar gráfica:', error);
    }
}


async function cargarIndicadores() {
    try {
        const data = await fetchConToken(`${API_URL}/movimientos/indicadores`);


        document.getElementById('promedioDiario').textContent =
            formatoMoneda(data.promedio_diario || 0);


        document.getElementById('mejorDia').textContent =
            data.mejor_dia_fecha
                ? `${formatearFecha(data.mejor_dia_fecha)} - ${formatoMoneda(data.mejor_dia_total)}`
                : '—';

        document.getElementById('peorDia').textContent =
            data.peor_dia_fecha
                ? `${formatearFecha(data.peor_dia_fecha)} - ${formatoMoneda(data.peor_dia_total)}`
                : '—';

    } catch (error) {
        console.error('Error al cargar indicadores:', error);
    }
}



const fechaFiltro = document.getElementById('fechaFiltro');


function formatoMoneda(valor) {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0
    }).format(valor);
}


let metaMensual = 0;

const btnGuardarMeta = document.getElementById('guardarMeta');

if (btnGuardarMeta) {
    btnGuardarMeta.addEventListener('click', async () => {

        const valor = Number(document.getElementById('metaMensual').value);

        if (valor <= 0) {
            return mostrarModal("error", "Error", "Ingresa una meta válida");
        }

        try {
            const data = await fetchConToken(`${API_URL}/meta`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ valor })
            });

            mostrarModal("success", "Meta guardada", data.message);

            document.getElementById('metaMensual').value = '';

            await cargarMeta();

        } catch (error) {
            console.error(error);
            mostrarModal("error", "Error", "No se pudo guardar la meta");
        }

    });
}


async function cargarPromedioHistorico() {
    try {
        const data = await fetchConToken(`${API_URL}/movimientos/promedio-historico`);

        const promedioHistorico = Number(data.promedio_historico || 0);
        document.getElementById('promedioHistorico').textContent =
            formatoMoneda(promedioHistorico);

        // Tomamos el total del mes actual YA calculado
        const totalMes = Number(
            document.getElementById('totalMes')
                .textContent.replace(/[^0-9]/g, '')
        );

        const comparacion = document.getElementById('comparacionHistorica');

        if (totalMes > promedioHistorico) {
            comparacion.textContent = '✅ Este mes está por ENCIMA del promedio histórico';
            comparacion.style.color = 'green';
        } else if (totalMes < promedioHistorico) {
            comparacion.textContent = '⚠️ Este mes está por DEBAJO del promedio histórico';
            comparacion.style.color = 'red';
        } else {
            comparacion.textContent = '➖ Este mes está en el PROMEDIO histórico';
            comparacion.style.color = 'gray';
        }

    } catch (error) {
        console.error('Error al cargar promedio histórico:', error);
    }
}


async function cargarSucursales() {
    const sucursales = await fetchConToken(`${API_URL}/sucursales`);

    const contenedor = document.getElementById('tabsSucursales');
    contenedor.innerHTML = '';

    sucursales.forEach(s => {
        const btn = document.createElement('button');
        btn.textContent = s.nombre;
        btn.onclick = () => {
            sucursalActual = s.id;
            recargarTodo();
        };
        contenedor.appendChild(btn);
    });
}

async function cargarIngresosPaginados(pagina = 1) {
    try {
        let url = `${API_URL}/movimientos?page=${pagina}&categoria=ingreso`;

        if (modoVista === "mes") {
            url += `&mes=${obtenerMesActual()}`;
        }

        const data = await fetchConToken(url);

        const tbody = document.querySelector('#tablaIngresos tbody');
        tbody.innerHTML = '';

        data.datos.forEach(item => {
            const desc = (item.descripcion || '').replace(/'/g, "\\'");
            const fila = document.createElement('tr');

            fila.innerHTML = `
                <td>${formatearFecha(item.fecha)}</td>
                <td>${formatoMoneda(item.monto)}</td>
                <td>
                    <span class="tipo-tag ingreso">${item.tipo}</span>
                </td>
                <td>${item.descripcion || ''}</td>
                <td>
                    <button onclick="abrirEditor(
                        ${item.id},
                        '${item.fecha}',
                        ${item.monto},
                        '${desc}',
                        ${item.tipo_id}
                    )">Editar</button>

                    <button onclick="eliminarIngreso(${item.id})">Eliminar</button>
                </td>
            `;

            tbody.appendChild(fila);
        });

        // PAGINACIÓN
        paginaActual = data.pagina;
        totalPaginas = data.totalPaginas;

        actualizarPaginacion();

        // CONTADOR
        document.getElementById('contadorIngresos').textContent =
            `${data.total ?? data.datos.length} ingresos`;

        cargarSumaTotal();
        cargarGraficaDonaIngresos();

    } catch (error) {
        console.error('Error cargando ingresos:', error);
    }
}



async function cargarGastosPaginados(pagina = 1) {
    try {
        
        let url = `${API_URL}/movimientos?page=${pagina}&categoria=gasto`;

        if (modoVista === "mes") {
            url += `&mes=${obtenerMesActual()}`;
        }


        const data = await fetchConToken(url);

        const tbody = document.querySelector('#tablaGastos tbody');
        tbody.innerHTML = '';

        data.datos.forEach(item => {
            const fila = document.createElement('tr');

            fila.innerHTML = `
                <td>${formatearFecha(item.fecha)}</td>
                <td>${formatoMoneda(item.monto)}</td>
                <td>
                <span class="tipo-tag gasto">
                    ${item.tipo}
                </span>
                </td>
                <td>${item.descripcion || ''}</td>

                <td>
                    <button onclick="abrirEditorGasto(
                        ${item.id},
                        '${item.fecha}',
                        ${item.monto},
                        '${item.descripcion || ''}',
                        ${item.tipo_id}
                    )">Editar</button>

                    <button onclick="eliminarGasto(${item.id})">Eliminar</button>
                </td>

            `;

            tbody.appendChild(fila);
        });

        paginaActual = data.pagina;
        totalPaginas = data.totalPaginas;

    
        document.getElementById('contadorGastos').textContent =
            `${data.total ?? data.datos.length} gastos`;


    } catch (error) {
        console.error('Error cargando gastos:', error);
    }



    actualizarPaginacion();
    cargarSumaTotalGastos();
    cargarGraficaDonaGastos();
}


function actualizarPaginacion() {

    btnPrev.disabled = paginaActual === 1;
    btnPrimero.disabled = paginaActual === 1;

    btnNext.disabled = paginaActual === totalPaginas;
    btnUltimo.disabled = paginaActual === totalPaginas;

    if (seccionActual === 'ingresos') {
        document.getElementById('paginaActual').textContent = paginaActual;
        document.getElementById('totalPaginas').textContent = totalPaginas;
    }

    if (seccionActual === 'gastos') {
        document.getElementById('paginaActualGasto').textContent = paginaActual;
        document.getElementById('totalPaginasGasto').textContent = totalPaginas;
    }
}

function pintarTabla(ingresos) {
    const tbody = document.querySelector('#tablaIngresos tbody');
    tbody.innerHTML = '';

    
        if (!ingresos) return;
        ingresos.forEach(ingreso => {

        const fila = document.createElement('tr');
        fila.innerHTML = `
            <td>${formatearFecha(ingreso.fecha)}</td>
            <td>${formatoMoneda(ingreso.monto)}</td>
            <td><span class="tipo-tag ${ingreso.categoria === 'gasto' ? 'gasto' : 'ingreso'}">${ingreso.tipo}</span></td>
            <td>${ingreso.descripcion}</td>
            <td>
            <button onclick="abrirEditor(
                ${ingreso.id},
                '${ingreso.fecha}',
                ${ingreso.monto},
                '${ingreso.descripcion || ''}',
                ${ingreso.tipo_id}
            )">
                Editar
            </button>
                <button onclick="eliminarIngreso(${ingreso.id})">Eliminar</button>
            </td>
        `;
        tbody.appendChild(fila);
    });
}


function mostrarSeccion(id) {
    cerrarModalReporte();
    seccionActual = id;

    eliminadosAbierto = false;

    document.getElementById('contenedorEliminados').style.display = 'none';
    document.getElementById('btnEliminados').textContent = "Ver movimientos borrados";


    modoFiltro = false;
    window.filtrosActivos = null;

    const panelIngresos = document.getElementById('panelFiltros');
    if (panelIngresos) panelIngresos.style.display = 'none';

    const panelGastos = document.getElementById('panelFiltrosGastos');
    if (panelGastos) panelGastos.style.display = 'none';

    document.querySelectorAll('.seccion').forEach(sec => {
        sec.classList.add('oculto');
    });

    document.getElementById(id).classList.remove('oculto');

    if (id === 'ingresos') {
        paginaActual = 1;
        configurarPaginacion();
        cargarIngresosPaginados();
    }

    if (id === 'gastos') {
        paginaActual = 1;
        configurarPaginacion();
        cargarGastosPaginados();
    }



    if (id === 'dashboard') {
        
        if (grafica) {
                grafica.destroy();
                grafica = null;
            }

        rangoGrafica = "1m";

        cargarMeta();
        cargarResumen();
        cargarGrafica();
        cargarIndicadores();
        cargarIndicadoresGastos();
    }



    if (id === 'configuracion') {
        resetearEliminados();

        eliminadosAbierto = false;

        document.getElementById('contenedorEliminados').style.display = 'none';
        document.getElementById('btnEliminados').textContent = "Ver movimientos borrados";
    }


}


function recargarTodo() {
    cargarResumen();
    cargarIndicadores();
    cargarGrafica();
}

lucide.createIcons();

async function cargarTipos(selectedId = null) {
    try {
        const tipos = await fetchConToken(`${API_URL}/tipos`);

        const selectCrear = document.getElementById('tipo');
        const selectEditar = document.getElementById('editTipo');

        // Limpiar
        selectCrear.innerHTML = '<option value="">Seleccione un tipo</option>';
        if (selectEditar) {
            selectEditar.innerHTML = '<option value="">Seleccione un tipo</option>';
        }

        tipos.forEach(tipo => {
            // Crear opción
            const option = document.createElement('option');
            option.value = tipo.id;
            option.textContent = tipo.nombre;

            selectCrear.appendChild(option);

            if (selectEditar) {
                const optionEdit = option.cloneNode(true);

               if (selectedId && tipo.id == selectedId) {
                optionEdit.selected = true;
                selectEditar.value = tipo.id; // 🔥 ESTA LÍNEA ES LA CLAVE
            }   

                selectEditar.appendChild(optionEdit);
            }
        });

    } catch (error) {
        console.error('Error al cargar tipos:', error);
    }
}


const btnFiltros = document.getElementById('btnFiltros');
if (btnFiltros) {
    btnFiltros.addEventListener('click', () => {

    const panel = document.getElementById('panelFiltros');

    if (panel.style.display === 'block') {

        // cerrar filtros
        panel.style.display = 'none';

        // reset estado
        modoFiltro = false;
        window.filtrosActivos = null;

        // volver a TODOS automáticamente
        paginaActual = 1;
        cargarIngresosPaginados(1);
        cargarSumaTotal();

    } else {

        panel.style.display = 'block';
    }
});};




async function cargarTiposEnFiltro() {
    const tipos = await fetchConToken(`${API_URL}/tipos`);

    const select = document.getElementById('valorFiltro');

    select.innerHTML = '<option value="">Seleccione un tipo</option>';

    tipos
        .filter(t => t.categoria === (seccionActual === 'gastos' ? 'gasto' : 'ingreso'))
        .forEach(t => {
            const option = document.createElement('option');
            option.value = t.id;
            option.textContent = t.nombre;
            select.appendChild(option);
        });
}


async function cargarTiposEnFiltroGastos() {
    const tipos = await fetchConToken(`${API_URL}/tipos`);

    const select = document.getElementById('valorFiltroGastos');

    if (!select) return;

    select.innerHTML = '<option value="">Seleccione un tipo</option>';

    tipos
        .filter(t => t.categoria === 'gasto')
        .forEach(t => {
            const option = document.createElement('option');
            option.value = t.id;
            option.textContent = t.nombre;
            select.appendChild(option);
        });
}


const btnAplicarFiltroGastos = document.getElementById('btnAplicarFiltroGastos');

if (btnAplicarFiltroGastos) {
    btnAplicarFiltroGastos.addEventListener('click', async () => {

    modoFiltro = true;

    const tipoFiltro = document.getElementById('tipoFiltroGastos').value;
    const valor = document.getElementById('valorFiltroGastos')?.value;
    const sinDesc = document.getElementById('sinDescripcionGastos')?.checked;
    const params = new URLSearchParams();
    if (modoVista === "mes") {
        params.append('mes', obtenerMesActual());
    }

    paginaActual = 1;
    params.append('page', 1);

    if (
        tipoFiltro !== 'descripcion' &&
        !(tipoFiltro === 'fecha' && document.getElementById('modoFechaGastos')?.value === 'rango') &&
        !valor
    ) {
        mostrarModal("error", "Error", "Selecciona un valor válido");
        return;
    }


    if (tipoFiltro === 'tipo') {
        params.append('tipo', valor);
    }

    else if (tipoFiltro === 'monto') {
        params.append('monto', valor);
    }

    else if (tipoFiltro === 'descripcion') {
        if (sinDesc) {
            params.append('sinDescripcion', 'true');
        } else {
            params.append('descripcion', valor);
        }
    }

    else if (tipoFiltro === 'fecha') {
        const modo = document.getElementById('modoFechaGastos')?.value;

        if (modo === 'dia') params.append('fecha', valor);
        if (modo === 'mes') params.append('mes', valor);
        if (modo === 'anio') params.append('anio', valor);

        
        if (modo === 'rango') {
            const inicio = document.getElementById('fechaInicio').value;
            const fin = document.getElementById('fechaFin').value;

            if (!inicio || !fin) {
                mostrarModal("error", "Error", "Selecciona un rango válido");
                return;
            }

            params.append('fechaInicio', inicio);
            params.append('fechaFin', fin);
        }

    }

    window.filtrosActivos = Object.fromEntries(params.entries());
    delete window.filtrosActivos.page;

    
    let url = `${API_URL}/movimientos?` + params.toString();

    if (seccionActual === 'ingresos') {
        url += '&categoria=ingreso';
    }

    if (seccionActual === 'gastos') {
        url += '&categoria=gasto';
    }

    const data = await fetchConToken(url);

    console.log(data);
    // Mostrar la meta en la consola
    console.log("Meta:", metaMensual);

    //backend
    const lista = Array.isArray(data) ? data : data.datos;
    
    if (seccionActual === 'ingresos') {
        pintarTabla(lista);
    }

    if (seccionActual === 'gastos') {
        pintarTablaGastos(lista);
    }


    // AHORA SÍ FUNCIONA TODO
    paginaActual = data.pagina;
    totalPaginas = data.totalPaginas;

    if (seccionActual === 'ingresos') {
        document.getElementById('contadorIngresos').textContent =
            `${Array.isArray(data) ? data.length : data.total ?? 0} ingresos`;
    }

    if (seccionActual === 'gastos') {
        document.getElementById('contadorGastos').textContent =
            `${Array.isArray(data) ? data.length : data.total ?? 0} gastos`;
    }


    actualizarPaginacion();
    cargarSumaTotal(window.filtrosActivos);
    if (seccionActual === 'gastos') {
        cargarSumaTotalGastos(window.filtrosActivos);
    }

})};

function pintarTablaGastos(lista) {
    const tbody = document.querySelector('#tablaGastos tbody');
    tbody.innerHTML = '';

    lista.forEach(item => {
        const fila = document.createElement('tr');

        fila.innerHTML = `
            <td>${formatearFecha(item.fecha)}</td>
            <td>${formatoMoneda(item.monto)}</td>

            <td>
                <span class="tipo-tag gasto">
                    ${item.tipo}
                </span>
            </td>

            <td>${item.descripcion || ''}</td>

            <td>
                <button onclick="abrirEditorGasto(
                    ${item.id},
                    '${item.fecha}',
                    ${item.monto},
                    '${item.descripcion || ''}',
                    ${item.tipo_id}
                )">Editar</button>

                <button onclick="eliminarGasto(${item.id})">Eliminar</button>
            </td>

        `;

        tbody.appendChild(fila);
    });
}


const btn = document.getElementById('btnLimpiarFiltro');
if (btn) {
    btn.addEventListener(
'click', () => {

    // limpiar inputs
    document.getElementById('tipoFiltro').value = '';
    document.getElementById('inputFiltro').innerHTML = '';

    // limpiar estado
    modoFiltro = false;
    window.filtrosActivos = null;

    // IMPORTANTE: recargar tabla
    if (seccionActual === 'ingresos') {
        cargarIngresosPaginados(1);
    }

    if (seccionActual === 'gastos') {
        cargarGastosPaginados(1);
        cargarSumaTotalGastos();
    }

    cargarSumaTotal(); 

})};

document.getElementById('btnLimpiarFiltroGastos').addEventListener('click', () => {

    document.getElementById('tipoFiltroGastos').value = '';
    document.getElementById('inputFiltroGastos').innerHTML = '';

    modoFiltro = false;
    window.filtrosActivos = null;

    cargarGastosPaginados(1);
    cargarSumaTotalGastos();
});


async function aplicarFiltroConPagina(page) {

    const params = new URLSearchParams(window.filtrosActivos || {});
    params.set('page', page);

    
    if (modoVista === "mes" && !window.filtrosActivos?.mes) {
        params.append('mes', obtenerMesActual());
    }


    let url = `${API_URL}/movimientos?` + params.toString();

    if (seccionActual === 'ingresos') {
        url += '&categoria=ingreso';
    }

    if (seccionActual === 'gastos') {
        url += '&categoria=gasto';
    }


    const data = await fetchConToken(url);

    paginaActual = data.pagina;
    totalPaginas = data.totalPaginas;

    
    if (seccionActual === 'ingresos') {
        pintarTabla(data.datos); // 🔥 ESTA LÍNEA FALTABA

        document.getElementById('contadorIngresos').textContent =
            `${data.total ?? data.datos?.length ?? 0} ingresos`;

        cargarSumaTotal(window.filtrosActivos);
        cargarGraficaDonaIngresos(); // opcional pero recomendado
    }


    if (seccionActual === 'gastos') {
        pintarTablaGastos(data.datos);

        document.getElementById('contadorGastos').textContent =
            `${data.total ?? 0} gastos`;

        cargarSumaTotalGastos(window.filtrosActivos);
        cargarGraficaDonaGastos();
    }



    actualizarPaginacion();

}


async function cargarTiposPorCategoria(categoria, selectId) {
    try {
        const tipos = await fetchConToken(`${API_URL}/tipos`);

        const select = document.getElementById(selectId);

        select.innerHTML = '<option value="">Seleccione un tipo</option>';

        tipos
            .filter(t => t.categoria === categoria)
            .forEach(t => {
                const option = document.createElement('option');
                option.value = t.id;
                option.textContent = t.nombre;
                select.appendChild(option);
            });

    } catch (error) {
        console.error('Error cargando tipos:', error);
    }
}


async function cargarIndicadoresGastos() {
    const data = await fetchConToken(`${API_URL}/movimientos/indicadores-gastos`);

    const promEl = document.getElementById('promedioGasto');
    if (promEl) {
        promEl.textContent = formatoMoneda(data.promedio_gasto || 0);
    }

    const peorEl = document.getElementById('peorDiaGasto');
    if (peorEl) {
        peorEl.textContent =
            data.peor_dia_fecha
                ? `${formatearFecha(data.peor_dia_fecha)} - ${formatoMoneda(data.peor_dia_total)}`
                : '—';
    }
}

async function llenarTipos(select) {
    const tipos = await fetchConToken(`${API_URL}/tipos`);

    select.innerHTML = '<option value="">Seleccione un tipo</option>';

    tipos.forEach(t => {
        const option = document.createElement('option');
        option.value = t.id;
        option.textContent = t.nombre;
        select.appendChild(option);
    });
}


// Cargar la gráfica de dona para los ingresos
let graficaDona = null;

async function cargarGraficaDonaIngresos() {

    let url = `${API_URL}/movimientos/por-tipo?categoria=ingreso`;

    if (modoVista === "mes") {
        url += `&mes=${obtenerMesActual()}`;
    }


    const data = await fetchConToken(url);

    const labels = data.map(d => d.tipo);
    const valores = data.map(d => Number(d.total));

    const chartEl = document.querySelector("#graficaDonaIngresos");
    if (!chartEl) return;

    // destruir si ya existe
    if (graficaDona) {
        graficaDona.destroy();
    }

    const options = {
        chart: {
            type: 'donut',
            height: 300
        },
        series: valores,
        labels: labels,

        colors: ['#3b82f6', '#10b981', '#f59e0b', '#6366f1'],

        legend: {
            position: 'bottom'
        },

        tooltip: {
            y: {
                formatter: (value) => formatoMoneda(value)
            }
        },
        
        
    };
        if (!data || data.length === 0) {

        if (graficaDona) {
            graficaDona.destroy();
            graficaDona = null;
        }

        const chartEl = document.querySelector("#graficaDonaIngresos");
        chartEl.innerHTML = "<p style='text-align:center;'>Sin datos</p>";
        return;
    }

    graficaDona = new ApexCharts(chartEl, options);

    setTimeout(() => {
        graficaDona.render();
        
        setTimeout(() => {
            graficaDona.updateOptions({});
        }, 50);

    }, 0);
}

let graficaDonaGastos = null;

async function cargarGraficaDonaGastos() {

    let url = `${API_URL}/movimientos/por-tipo?categoria=gasto`;

    if (modoVista === "mes") {
        url += `&mes=${obtenerMesActual()}`;
    }


    const data = await fetchConToken(url);

    const labels = data.map(d => d.tipo);
    const valores = data.map(d => Number(d.total));

    const chartEl = document.querySelector("#graficaDonaGastos");
    if (!chartEl) return;

    if (graficaDonaGastos) {
        graficaDonaGastos.destroy();
    }

    const options = {
        chart: {
            type: 'donut',
            height: 300
        },
        series: valores,
        labels: labels,
        colors: ['#ef4444', '#f59e0b', '#dc2626', '#991b1b'],

        legend: {
            position: 'bottom'
        },

        tooltip: {
            y: {
                formatter: (value) => formatoMoneda(value)
            }
        }
    };

    
    if (!data || data.length === 0) {

        if (graficaDonaGastos) {
            graficaDonaGastos.destroy();
            graficaDonaGastos = null;
        }

        const chartEl = document.querySelector("#graficaDonaGastos");
        chartEl.innerHTML = "<p style='text-align:center;'>Sin datos</p>";
        return;
    }

    graficaDonaGastos = new ApexCharts(chartEl, options);
    graficaDonaGastos.render();
}

async function cargarSumaTotal(filtros = null) {
    let url = `${API_URL}/movimientos/suma?categoria=ingreso`;

    if (filtros) {
        url += '&' + new URLSearchParams(filtros).toString();
    }
        
    if (modoVista === "mes" && !filtros) {
        url += `&mes=${obtenerMesActual()}`;
    }

    const data = await fetchConToken(url);

    document.getElementById('sumaIngresos').textContent =
        formatoMoneda(data.total);
}

async function cargarSumaTotalGastos(filtros = null) {
    let url = `${API_URL}/movimientos/suma?categoria=gasto`;

    if (filtros) {
        url += '&' + new URLSearchParams(filtros).toString();
    }

    if (modoVista === "mes" && !filtros) {
        url += `&mes=${obtenerMesActual()}`;
    }

    const data = await fetchConToken(url);

    document.getElementById('sumaGastos').textContent =
        formatoMoneda(data.total);
}

let gastoEditandoId = null;

function abrirEditorGasto(id, fecha, monto, descripcion, tipo) {

    gastoEditandoId = id;

    document.getElementById('editFechaGasto').value = fecha.split('T')[0];
    document.getElementById('editMontoGasto').value = monto;
    document.getElementById('editDescripcionGasto').value = descripcion;

    cargarTiposPorCategoria('gasto', 'editTipoGasto');

    setTimeout(() => {
        document.getElementById('editTipoGasto').value = tipo;
    }, 0);

    document.getElementById('panelEditarGasto').classList.remove('oculto');
}


async function cargarEliminadosPaginados(categoria, pagina = 1) {

    const url = `${API_URL}/movimientos/eliminados?categoria=${categoria}&page=${pagina}`;

    const data = await fetchConToken(url);

    const totalPaginasReal = Math.ceil((data.total || 0) / 10) || 1;


    if (categoria === 'ingreso') {
        document.getElementById('totalPaginasIngresosEliminados').textContent = totalPaginasReal;
    }

    if (categoria === 'gasto') {
        document.getElementById('totalPaginasEliminadosGastos').textContent = totalPaginasReal;
    }


    let tabla = '';
    let contador = '';

    if (categoria === 'ingreso') {
        tabla = document.getElementById('tablaEliminadosIngresos');
        contador = document.getElementById('contadorEliminadosIngresos');

        paginaEliminadosIngresos = data.pagina;
        totalPaginasEliminadosIngresos = totalPaginasReal;
    }

    if (categoria === 'gasto') {
        tabla = document.getElementById('tablaEliminadosGastos');
        contador = document.getElementById('contadorEliminadosGastos');

        paginaEliminadosGastos = data.pagina;
        totalPaginasEliminadosGastos = totalPaginasReal;
    }

    tabla.innerHTML = '';

    data.datos.forEach(m => {
        tabla.innerHTML += `
            <tr>
                <td>${formatearFecha(m.fecha)}</td>
                <td>${formatoMoneda(m.monto)}</td>  
                <td>${m.tipo}</td>
                <td>${m.descripcion || ''}</td>
                <td>
                    <button onclick="confirmarRestaurar(${m.id})">
                        Restaurar
                    </button>
                </td>
            </tr>
        `;
    });

    contador.textContent = `${data.total} ${categoria === 'ingreso' ? 'ingresos' : 'gastos'}`;

    // ✅ TEXTO DE PAGINACIÓN
    if (categoria === 'ingreso') {
        document.getElementById('paginaIngresosEliminados').textContent = data.pagina;
    }

    if (categoria === 'gasto') {
        document.getElementById('paginaEliminadosGastos').textContent = data.pagina;
    }

    // ✅ BLOQUEAR BOTONES (🔥 ESTO SOLUCIONA TU BUG UX)
    const paginaSegura = Math.min(data.pagina, totalPaginasReal);
    const esPrimera = paginaSegura === 1;
    const esUltima = paginaSegura === totalPaginasReal;

    if (categoria === 'ingreso') {
        document.getElementById('btnPrevEliminadosIngresos').disabled = esPrimera;
        document.getElementById('btnPrimeroEliminadosIngresos').disabled = esPrimera;

        document.getElementById('btnNextEliminadosIngresos').disabled = esUltima;
        document.getElementById('btnUltimoEliminadosIngresos').disabled = esUltima;
    }

    if (categoria === 'gasto') {
        document.getElementById('btnPrevEliminadosGastos').disabled = esPrimera;
        document.getElementById('btnPrimeroEliminadosGastos').disabled = esPrimera;

        document.getElementById('btnNextEliminadosGastos').disabled = esUltima;
        document.getElementById('btnUltimoEliminadosGastos').disabled = esUltima;
    }


}



function generarTablaEliminados(lista) {
    if (lista.length === 0) {
        return `<p>No hay registros</p>`;
    }

    return `
        <table>
            <tr>
                <th>Fecha</th>
                <th>Monto</th>
                <th>Tipo</th>
                <th>Descripción</th>
                <th>Acción</th>
            </tr>
            ${lista.map(m => `
                <tr>
                    <td>${m.fecha}</td>
                    <td>$${m.monto}</td>
                    <td>${m.tipo}</td>
                    <td>${m.descripcion || ''}</td>
                    <td>
                        <button onclick="confirmarRestaurar(${m.id})">
                            Restaurar
                        </button>
                    </td>
                </tr>
            `).join('')}
        </table>
    `;
}

function confirmarRestaurar(id) {

    mostrarModal("confirm", "Restaurar", "¿Seguro que deseas restaurar este movimiento?", () => {
        restaurarMovimiento(id);
    });

}

async function restaurarMovimiento(id) {
    const data = await fetchConToken(`${API_URL}/movimientos/restaurar/${id}`, {
        method: 'PUT'
    });

    mostrarModal("success", "Proceso exitoso", data.message);

    // recargar tabla eliminados
    cargarEliminadosPaginados('ingreso', paginaEliminadosIngresos);
    cargarEliminadosPaginados('gasto', paginaEliminadosGastos);
}

function toggleEliminados() {
    eliminadosAbierto = !eliminadosAbierto;

    const contenedor = document.getElementById('contenedorEliminados');
    const boton = document.getElementById('btnEliminados');

    if (eliminadosAbierto) {
        contenedor.style.display = 'block';
        boton.textContent = "Ocultar movimientos borrados";
        cargarEliminadosPaginados('ingreso', 1);
        cargarEliminadosPaginados('gasto', 1);
    } else {
        contenedor.style.display = 'none';
        boton.textContent = "Ver movimientos borrados";
    }
}

async function cambiarPaginaEliminados(categoria, direccion) {

    let pagina, totalPaginas, filtros;

    if (categoria === 'ingreso') {
        paginaEliminadosIngresos += direccion;
        pagina = paginaEliminadosIngresos;
        totalPaginas = totalPaginasEliminadosIngresos;
        filtros = { ...filtrosEliminadosIngresos }; // ✅ CLON
    }

    if (categoria === 'gasto') {
        paginaEliminadosGastos += direccion;
        pagina = paginaEliminadosGastos;
        totalPaginas = totalPaginasEliminadosGastos;
        filtros = { ...filtrosEliminadosGastos }; // ✅ CLON
    }

    // ✅ CONTROL BASE
    if (pagina < 1) pagina = 1;
    if (pagina > totalPaginas) pagina = totalPaginas;

    // ===============================
    // ✅ CON FILTROS
    // ===============================
    if (Object.keys(filtros).length > 0) {

        delete filtros.page; // ✅ CRÍTICO

        const params = new URLSearchParams(filtros);
        params.set('page', pagina);
        params.set('categoria', categoria);
        params.set('eliminado', true);

        const data = await fetchConToken(
            `${API_URL}/movimientos/eliminados?` + params.toString()
        );
        
        const totalPaginasReal = Math.ceil((data.total || 0) / 10) || 1;


        // ✅ NORMALIZAR PÁGINA (🔥 EVITA 3 DE 1)
        const paginaSegura = Math.min(data.pagina, totalPaginasReal);


        // ✅ RENDER
        renderTablaEliminados(
            data.datos,
            categoria === 'ingreso'
                ? 'tablaEliminadosIngresos'
                : 'tablaEliminadosGastos'
        );

        // ✅ ACTUALIZAR ESTADO
        if (categoria === 'ingreso') {
            paginaEliminadosIngresos = paginaSegura;

            document.getElementById('paginaIngresosEliminados').textContent = paginaSegura;
        }

        if (categoria === 'gasto') {
            paginaEliminadosGastos = paginaSegura;

            document.getElementById('paginaEliminadosGastos').textContent = paginaSegura;
        }

        // ✅ BLOQUEO DE BOTONES
        const esPrimera = paginaSegura === 1;
        const esUltima = paginaSegura === totalPaginasReal;

        if (categoria === 'ingreso') {
            document.getElementById('btnPrevEliminadosIngresos').disabled = esPrimera;
            document.getElementById('btnPrimeroEliminadosIngresos').disabled = esPrimera;

            document.getElementById('btnNextEliminadosIngresos').disabled = esUltima;
            document.getElementById('btnUltimoEliminadosIngresos').disabled = esUltima;
        }

        if (categoria === 'gasto') {
            document.getElementById('btnPrevEliminadosGastos').disabled = esPrimera;
            document.getElementById('btnPrimeroEliminadosGastos').disabled = esPrimera;

            document.getElementById('btnNextEliminadosGastos').disabled = esUltima;
            document.getElementById('btnUltimoEliminadosGastos').disabled = esUltima;
        }

    }

    // ===============================
    // ✅ SIN FILTROS
    // ===============================
    else {
        cargarEliminadosPaginados(categoria, pagina);
    }
}


function abrirFiltrosEliminados(categoria) {

    let panel;

    if (categoria === 'ingreso') {
        panel = document.getElementById('panelFiltrosEliminadosIngresos');
    }

    if (categoria === 'gasto') {
        panel = document.getElementById('panelFiltrosEliminadosGastos');
    }

    // TOGGLE REAL
    if (panel.style.display === 'block') {
        panel.style.display = 'none';
    } else {
        panel.style.display = 'block';
    }
}


async function aplicarFiltroEliminados(categoria) {

    let tipoFiltro, valor;
    let params = new URLSearchParams();

    if (categoria === 'ingreso') {
        tipoFiltro = document.getElementById('tipoFiltroEliminadosIngresos').value;
        valor = document.getElementById('valorFiltroEliminadosIngresos')?.value;
        paginaEliminadosIngresos = 1;
    }

    if (categoria === 'gasto') {
        tipoFiltro = document.getElementById('tipoFiltroEliminadosGastos').value;
        valor = document.getElementById('valorFiltroEliminadosGastos')?.value;
        paginaEliminadosGastos = 1;
    }

    // VALIDACIÓN
    if (!valor) {
        mostrarModal("error", "Error", "Selecciona un valor");
        return;
    }

    // PARAMS
    params.append('categoria', categoria);
    if (tipoFiltro === 'tipo') {
        params.append('tipo', valor);
    }

    else if (tipoFiltro === 'monto') {
        params.append('monto', Number(valor));
    }

    else if (tipoFiltro === 'descripcion') {
        params.append('descripcion', valor.trim());
    }

    else if (tipoFiltro === 'fecha') {
        params.append('fecha', valor);
    }
    params.append('eliminado', true);
    params.append('page', 1);


    const filtrosLimpios = Object.fromEntries(params.entries());
    delete filtrosLimpios.page;

    const url = `${API_URL}/movimientos/eliminados?` + new URLSearchParams({
        ...filtrosLimpios,
        page: 1,
        categoria,
        eliminado: true
    }).toString();


    // FETCH
    const data = await fetchConToken(url);

    // ACTUALIZAR CONTADOR (AQUÍ VA CORRECTAMENTE)
    if (categoria === 'ingreso') {
        document.getElementById('contadorEliminadosIngresos').textContent =
            `${data.total} ingresos`;
    }

    if (categoria === 'gasto') {
        document.getElementById('contadorEliminadosGastos').textContent =
            `${data.total} gastos`;
    }

    if (categoria === 'ingreso') {
        filtrosEliminadosIngresos = filtrosLimpios;
    }

    if (categoria === 'gasto') {
        filtrosEliminadosGastos = filtrosLimpios;
    }

    // ✅ RENDER CORRECTO
    if (categoria === 'ingreso') {
        renderTablaEliminados(data.datos, 'tablaEliminadosIngresos');
    }

    if (categoria === 'gasto') {
        renderTablaEliminados(data.datos, 'tablaEliminadosGastos');
    }

    const totalPaginasReal = Math.ceil((data.total || 0) / 10) || 1;

    // ✅ INGRESOS
    if (categoria === 'ingreso') {
        document.getElementById('totalPaginasIngresosEliminados').textContent = totalPaginasReal;
        totalPaginasEliminadosIngresos = totalPaginasReal;
    }

    // ✅ GASTOS
    if (categoria === 'gasto') {
        document.getElementById('totalPaginasEliminadosGastos').textContent = totalPaginasReal;
        totalPaginasEliminadosGastos = totalPaginasReal;
    }


    // ✅ NORMALIZAR PÁGINA
    const paginaSegura = Math.min(data.pagina, totalPaginasReal);


    if (categoria === 'ingreso') {
        paginaEliminadosIngresos = paginaSegura;

        document.getElementById('paginaIngresosEliminados').textContent = paginaSegura;
    }

    if (categoria === 'gasto') {
        paginaEliminadosGastos = paginaSegura;

        document.getElementById('paginaEliminadosGastos').textContent = paginaSegura;
    }

    const esPrimera = paginaSegura === 1;
    const esUltima = paginaSegura === totalPaginasReal;

    if (categoria === 'ingreso') {
        document.getElementById('btnPrevEliminadosIngresos').disabled = esPrimera;
        document.getElementById('btnPrimeroEliminadosIngresos').disabled = esPrimera;
        document.getElementById('btnNextEliminadosIngresos').disabled = esUltima;
        document.getElementById('btnUltimoEliminadosIngresos').disabled = esUltima;
    }

    if (categoria === 'gasto') {
        document.getElementById('btnPrevEliminadosGastos').disabled = esPrimera;
        document.getElementById('btnPrimeroEliminadosGastos').disabled = esPrimera;
        document.getElementById('btnNextEliminadosGastos').disabled = esUltima;
        document.getElementById('btnUltimoEliminadosGastos').disabled = esUltima;
    }

}

function renderTablaEliminados(lista, tablaId) {
    const tabla = document.getElementById(tablaId);
    tabla.innerHTML = '';

    lista.forEach(m => {
        tabla.innerHTML += `
            <tr>
                <td>${formatearFecha(m.fecha)}</td>
                <td>${formatoMoneda(m.monto)}</td>
                <td>${m.tipo}</td>
                <td>${m.descripcion || ''}</td>
                <td>
                    <button onclick="confirmarRestaurar(${m.id})">
                        Restaurar
                    </button>
                </td>
            </tr>
        `;
    });
}

const tipoFiltroEliminadosIngresos = document.getElementById('tipoFiltroEliminadosIngresos');

if (tipoFiltroEliminadosIngresos) {
    tipoFiltroEliminadosIngresos.addEventListener('change', () => {

        const tipo = tipoFiltroEliminadosIngresos.value;
        const contenedor = document.getElementById('inputFiltroEliminadosIngresos');

        contenedor.innerHTML = '';

        if (tipo === 'tipo') {
            contenedor.innerHTML = `<select id="valorFiltroEliminadosIngresos"></select>`;

            setTimeout(() => {
                cargarTiposEnFiltroEliminados('valorFiltroEliminadosIngresos', 'ingreso');
            }, 0);
        }

        else if (tipo === 'monto') {
            contenedor.innerHTML = `<input type="number" id="valorFiltroEliminadosIngresos">`;
        }

        else if (tipo === 'descripcion') {
            contenedor.innerHTML = `<input type="text" id="valorFiltroEliminadosIngresos">`;
        }

        else if (tipo === 'fecha') {
            contenedor.innerHTML = `<input type="date" id="valorFiltroEliminadosIngresos">`;
        }
    });
}

const tipoFiltroEliminadosGastos = document.getElementById('tipoFiltroEliminadosGastos');

if (tipoFiltroEliminadosGastos) {
    tipoFiltroEliminadosGastos.addEventListener('change', () => {

        const tipo = tipoFiltroEliminadosGastos.value;
        const contenedor = document.getElementById('inputFiltroEliminadosGastos');

        contenedor.innerHTML = '';

        if (tipo === 'tipo') {
            contenedor.innerHTML = `<select id="valorFiltroEliminadosGastos"></select>`;

            setTimeout(() => {
                cargarTiposEnFiltroEliminados('valorFiltroEliminadosGastos', 'gasto');
            }, 0);
        }

        else if (tipo === 'monto') {
            contenedor.innerHTML = `<input type="number" id="valorFiltroEliminadosGastos">`;
        }

        else if (tipo === 'descripcion') {
            contenedor.innerHTML = `<input type="text" id="valorFiltroEliminadosGastos">`;
        }

        else if (tipo === 'fecha') {
            contenedor.innerHTML = `<input type="date" id="valorFiltroEliminadosGastos">`;
        }
    });
}

async function cargarTiposEnFiltroEliminados(selectId, categoria) {
    const tipos = await fetchConToken(`${API_URL}/tipos`);

    const select = document.getElementById(selectId);

    if (!select) return;

    select.innerHTML = '<option value="">Seleccione un tipo</option>';

    tipos
        .filter(t => t.categoria === categoria)
        .forEach(t => {
            const option = document.createElement('option');
            option.value = t.id;
            option.textContent = t.nombre;
            select.appendChild(option);
        });
}

function limpiarFiltrosEliminados(categoria) {

    if (categoria === 'ingreso') {

        filtrosEliminadosIngresos = {};

        document.getElementById('tipoFiltroEliminadosIngresos').value = '';
        document.getElementById('inputFiltroEliminadosIngresos').innerHTML = '';

        paginaEliminadosIngresos = 1;

        cargarEliminadosPaginados('ingreso', 1);
    }

    if (categoria === 'gasto') {

        filtrosEliminadosGastos = {};

        document.getElementById('tipoFiltroEliminadosGastos').value = '';
        document.getElementById('inputFiltroEliminadosGastos').innerHTML = '';

        paginaEliminadosGastos = 1;

        cargarEliminadosPaginados('gasto', 1);
    }
}


function mostrarModal(tipo, titulo, mensaje, onConfirm = null) {

    const modal = document.getElementById("modal");
    const icono = document.getElementById("modal-icono");
    const tituloEl = document.getElementById("modal-titulo");
    const mensajeEl = document.getElementById("modal-mensaje");
    const botones = document.getElementById("modal-botones");

    console.log("🚨 MODAL EJECUTADO:", tipo, titulo, mensaje);

    // 🔥 SOLO USAMOS CLASES
    modal.classList.remove("oculto");

    botones.innerHTML = "";
    icono.className = "modal-icono";

    tituloEl.textContent = titulo;
    mensajeEl.textContent = mensaje;

    if (tipo === "success") {

        icono.innerHTML = `
        <div class="icono-circle success">✔</div>
        `;

        botones.innerHTML = `<button class="modal-btn ok">OK</button>`;

        botones.querySelector("button").onclick = () => {
            cerrarModal();
        };
    }

    else if (tipo === "error") {

        icono.innerHTML = `
        <div class="icono-circle error">✖</div>
        `;

        botones.innerHTML = `<button class="modal-btn ok">Aceptar</button>`;

        botones.querySelector("button").onclick = () => {
            cerrarModal();
        };
    }

    else if (tipo === "confirm") {

        icono.innerHTML = `
        <div class="icono-circle warning">!</div>
        `;

        botones.innerHTML = `
            <button class="modal-btn ok">Sí, continuar</button>
            <button class="modal-btn cancel">Cancelar</button>
        `;

        botones.querySelector(".ok").onclick = () => {
            cerrarModal();
            if (onConfirm) onConfirm();
        };

        botones.querySelector(".cancel").onclick = cerrarModal;
    }
}


function cerrarModal() {
    const modal = document.getElementById("modal");

    modal.classList.add("oculto");
}


function resetearEliminados() {

    // 🔥 Estado
    filtrosEliminadosIngresos = {};
    filtrosEliminadosGastos = {};

    paginaEliminadosIngresos = 1;
    paginaEliminadosGastos = 1;

    totalPaginasEliminadosIngresos = 1;
    totalPaginasEliminadosGastos = 1;

    // 🔥 UI filtros
    const filtroIng = document.getElementById('tipoFiltroEliminadosIngresos');
    const filtroGas = document.getElementById('tipoFiltroEliminadosGastos');

    if (filtroIng) filtroIng.value = '';
    if (filtroGas) filtroGas.value = '';

    const contIng = document.getElementById('inputFiltroEliminadosIngresos');
    const contGas = document.getElementById('inputFiltroEliminadosGastos');

    if (contIng) contIng.innerHTML = '';
    if (contGas) contGas.innerHTML = '';

    // 🔥 contadores visuales
    const pagIng = document.getElementById('paginaIngresosEliminados');
    const pagGas = document.getElementById('paginaEliminadosGastos');

    const totalIng = document.getElementById('totalPaginasIngresosEliminados');
    const totalGas = document.getElementById('totalPaginasEliminadosGastos');

    if (pagIng) pagIng.textContent = 1;
    if (pagGas) pagGas.textContent = 1;

    if (totalIng) totalIng.textContent = 1;
    if (totalGas) totalGas.textContent = 1;
}


async function register() {
    const email = document.getElementById('emailReg').value;
    const password = document.getElementById('passwordReg').value;

    const res = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    });

    const data = await res.json();
    alert(data.message);
}

async function fetchConToken(url, options = {}) {
    const token = localStorage.getItem('token');

    const res = await fetch(url, {
        ...options,
        headers: {
            ...options.headers,
            Authorization: 'Bearer ' + token
        }
    });

    if (res.status === 401) {
        localStorage.removeItem('token');
        window.location.href = 'index.html';
        return;
    }

    if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || 'Error en la petición');
    }



    const text = await res.text();
    try {
        return JSON.parse(text);
    } catch {
        throw new Error("Respuesta inválida del servidor");
    }

}




const btnLogin = document.querySelector('#btnLogin');


if (btnLogin) {
    btnLogin.addEventListener('click', async (e) => {
    e.preventDefault();

    const email = document.querySelector('#email').value;
    const password = document.querySelector('#password').value;

    try {
        const res = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });

        const data = await res.json();


        if (data.token) {

            localStorage.setItem('token', data.token);
            localStorage.setItem('usuarioEmail', email);

            // 🔥 ACTUALIZAR NOMBRE AHORA MISMO
            actualizarNombreUsuario();

            mostrarModal("success", "Bienvenido", "Login correcto");

            document.getElementById('login').classList.add('oculto');
            document.getElementById('navbar').classList.remove('oculto');
            document.getElementById('app').classList.remove('oculto');

            // 🔥 LIMPIAR TODO ANTES DE CARGAR NADA
            if (grafica) {
                grafica.destroy();
                grafica = null;
            }

            if (graficaDona) {
                graficaDona.destroy();
                graficaDona = null;
            }

            if (graficaDonaGastos) {
                graficaDonaGastos.destroy();
                graficaDonaGastos = null;
            }
            
            const contIngreso = document.querySelector("#graficaDonaIngresos");
            const contGasto = document.querySelector("#graficaDonaGastos");

            if (contIngreso) contIngreso.innerHTML = '';
            if (contGasto) contGasto.innerHTML = '';


            window.filtrosActivos = null;
            modoFiltro = false;
            paginaActual = 1;


            // 🔥 AHORA SÍ: cargar limpio
            mostrarSeccion('dashboard');

        } else {

            mostrarModal("error", "Error de autenticación", data.message);
        }


    } catch (error) {
        console.error(error);
        mostrarModal("error", "Error", "No se pudo conectar con el servidor");
    }
    });
}



const btnLogoutDropdown = document.getElementById('btnLogoutDropdown');
btnLogoutDropdown.addEventListener('click', () => {

    mostrarModal(
        "confirm",
        "Cerrar sesión",
        "¿Seguro que quieres cerrar sesión?",
        () => {

            // ✅ AQUÍ SÍ: limpiar TODO
            localStorage.removeItem('token');
            localStorage.removeItem('usuarioEmail');

            document.getElementById('navbar').classList.add('oculto');
            document.getElementById('app').classList.add('oculto');
            document.getElementById('login').classList.remove('oculto');

            // 🔥 LIMPIAR GRÁFICAS SOLO SI CONFIRMA
            if (graficaDona) {
                graficaDona.destroy();
                graficaDona = null;
            }
            
            if (grafica) {
                grafica.destroy();
                grafica = null;
            }

            if (graficaDonaGastos) {
                graficaDonaGastos.destroy();
                graficaDonaGastos = null;
            }

            // cerrar dropdown
            dropdownUsuario.classList.add('oculto');
        }
    );

});




const btnUsuario = document.getElementById('btnUsuario');
const dropdownUsuario = document.getElementById('dropdownUsuario');

if (btnUsuario) {
    btnUsuario.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdownUsuario.classList.toggle('oculto');
    });
}

// cerrar si haces click fuera
document.addEventListener('click', () => {
    if (dropdownUsuario) {
        dropdownUsuario.classList.add('oculto');
    }
});



function actualizarNombreUsuario() {
    const email = localStorage.getItem('usuarioEmail');
    const nombre = email ? email.split('@')[0] : 'Usuario';

    const el = document.getElementById('usuarioNombre');
    if (el) {
        el.innerHTML = `
            <span style="color:#6b7280;">Usuario:</span> 
            <strong>${nombre}</strong>
        `;

    }
}

function validarPassword(password) {

    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;

    return regex.test(password);
}

function mostrarRegistro() {
    document.getElementById('login').classList.add('oculto');
    document.getElementById('registro').classList.remove('oculto');
}

function mostrarLogin() {
    document.getElementById('registro').classList.add('oculto');
    document.getElementById('login').classList.remove('oculto');
}


function cerrarModalReporte() {
    const modal = document.getElementById('modalReporte');

    if (!modal) return;

    // 🔥 eliminar TODOS los estados posibles
    modal.classList.remove('activo');
    modal.classList.add('oculto');

    // limpiar inputs
    const tipo = document.getElementById('tipoFiltroReporte');
    const input = document.getElementById('inputReporte');

    if (tipo) tipo.value = '';
    if (input) input.innerHTML = '';
}


function togglePassword(inputId, iconContainer) {

    const input = document.getElementById(inputId);

    if (input.type === "password") {
        input.type = "text";
        iconContainer.classList.add("active"); // 🔥 azul
    } else {
        input.type = "password";
        iconContainer.classList.remove("active"); // 🔥 gris
    }
}

async function cargarMeta() {
    try {
        const data = await fetchConToken(`${API_URL}/meta`);

        metaMensual = data?.valor || 0;

        cargarResumen(); // 🔥 recalcula cerdito correctamente

    } catch (error) {
        console.error('Error cargando meta:', error);
    }

    const btnEliminar = document.getElementById('eliminarMeta');

    if (btnEliminar) {
        btnEliminar.disabled = metaMensual === 0;
    }
}


async function enviarReporte() {

    const res = await fetch(`${API_URL}/reporte`, {
        headers: {
            Authorization: 'Bearer ' + localStorage.getItem('token')
        }
    });

    const data = await res.json();

    mostrarModal("success", "Reporte enviado", data.message);
}

async function cargarTiposEnFiltroReporte() {
    const tipos = await fetchConToken(`${API_URL}/tipos`);

    const select = document.getElementById('valorReporte');

    if (!select) return;

    select.innerHTML = '<option value="">Seleccione un tipo</option>';

    tipos.forEach(t => {

        // ✅ SI ES "otros", lo diferenciamos
        let nombre = t.nombre;

        if (t.nombre.toLowerCase() === 'otros') {
            nombre += t.categoria === 'ingreso'
                ? ' (Ingreso)'
                : ' (Gasto)';
        }

        const option = document.createElement('option');
        option.value = t.id;
        option.textContent = nombre;

        select.appendChild(option);
    });
}

// 🔥 CERRAR MODAL AL HACER CLICK EN CUALQUIER NAVEGACIÓN
document.addEventListener('click', (e) => {

    const modal = document.getElementById('modalReporte');

    if (!modal) return;

    if (!modal.classList.contains('activo')) return;

    // NO cerrar si hace click dentro del modal
    if (e.target.closest('.modal-contenido-reporte')) return;

    // NO cerrar si hace click en el botón que lo abre
    if (e.target.closest('#btnExtracto')) return;

    // 🔥 TODO LO DEMÁS → CERRAR
    cerrarModalReporte();
});


function cambiarRango(rango, btn) {
    rangoGrafica = rango;

    document.querySelectorAll('.filtros-grafica button')
        .forEach(b => b.classList.remove('activo'));

    btn.classList.add('activo');

    cargarGrafica();
}

function obtenerMesActual() {
    const hoy = new Date();
    const year = hoy.getFullYear();
    const mes = String(hoy.getMonth() + 1).padStart(2, '0');
    return `${year}-${mes}`;
}

document.getElementById('btnMesActual').addEventListener('click', () => {
    modoVista = "mes";
    paginaActual = 1;

    modoFiltro = false;
    window.filtrosActivos = null;


    if (seccionActual === 'ingresos') {
        cargarIngresosPaginados(1);
    }

    if (seccionActual === 'gastos') {
        cargarGastosPaginados(1);
    }

    actualizarBotonesVista();
});

document.getElementById('btnTodos').addEventListener('click', () => {
    modoVista = "todos";
    paginaActual = 1;

    modoFiltro = false;
    window.filtrosActivos = null;

    if (seccionActual === 'ingresos') {
        cargarIngresosPaginados(1);
    }

    if (seccionActual === 'gastos') {
        cargarGastosPaginados(1);
    }

    actualizarBotonesVista();
});


function actualizarBotonesVista() {
    document.getElementById('btnMesActual').classList.remove('activo');
    document.getElementById('btnTodos').classList.remove('activo');

    if (modoVista === 'mes') {
        document.getElementById('btnMesActual').classList.add('activo');
    } else {
        document.getElementById('btnTodos').classList.add('activo');
    }
}