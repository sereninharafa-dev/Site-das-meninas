/* =====================================================
   BEMPERTO
   Protótipo demonstrativo
===================================================== */


/* =====================================================
   DADOS
===================================================== */

const demoUser = {
    username: "BP-0001",
    password: "bemperto123",
    name: "Brenda da Silva"
};


const locations = [];

let locationLoadState = "idle";


const professionals = {

    "Consulta médica": [

        {
            name: "Dra. Ana Souza",
            specialty: "Clínica Geral",
            location: "UBS Centro",
            icon: "👩‍⚕️"
        },

        {
            name: "Dr. Carlos Lima",
            specialty: "Clínico Geral",
            location: "Hospital Maicé",
            icon: "👨‍⚕️"
        },

        {
            name: "Dra. Juliana Pereira",
            specialty: "Endocrinologia",
            location: "UBS Martello",
            icon: "👩‍⚕️"
        }

    ],

    "Atendimento farmacêutico": [

        {
            name: "Farm. Mariana Alves",
            specialty: "Farmacêutica",
            location: "Farmácia Bem Cuidar",
            icon: "👩‍🔬"
        },

        {
            name: "Farm. Pedro Martins",
            specialty: "Farmacêutico",
            location: "Farmácia Popular",
            icon: "👨‍🔬"
        }

    ]

};


/* =====================================================
   ELEMENTOS
===================================================== */

const loginScreen =
    document.getElementById("loginScreen");

const app =
    document.getElementById("app");

const loginForm =
    document.getElementById("loginForm");

const loginError =
    document.getElementById("loginError");

const logoutButton =
    document.getElementById("logoutButton");


/* =====================================================
   LOGIN
===================================================== */

loginForm.addEventListener("submit", function (event) {

    event.preventDefault();

    const username =
        document.getElementById("username").value.trim();

    const password =
        document.getElementById("password").value;

    if (
        username === demoUser.username &&
        password === demoUser.password
    ) {

        loginScreen.classList.add("hidden");

        app.classList.remove("hidden");

        loginError.textContent = "";

        initializeApplication();

    } else {

        loginError.textContent =
            "Usuário ou senha incorretos.";

    }

});


logoutButton.addEventListener("click", function () {

    app.classList.add("hidden");

    loginScreen.classList.remove("hidden");

    loginForm.reset();

});


/* =====================================================
   NAVEGAÇÃO
===================================================== */

function navigateTo(pageName) {

    document
        .querySelectorAll(".page")
        .forEach(page => {

            page.classList.remove("active-page");

        });


    const target =
        document.getElementById(
            `page-${pageName}`
        );


    if (target) {

        target.classList.add("active-page");

    }


    document
        .querySelectorAll(".menu-item")
        .forEach(button => {

            button.classList.toggle(
                "active",
                button.dataset.page === pageName
            );

        });


    const sidebar =
        document.querySelector(".sidebar");

    sidebar.classList.remove("open");


    if (
        pageName === "mapa" &&
        map
    ) {

        setTimeout(() => {

            map.invalidateSize();

        }, 200);

    }


    if (pageName === "consultas") {

        renderAppointments();

    }

}


document
    .querySelectorAll("[data-page]")
    .forEach(button => {

        button.addEventListener("click", function () {

            navigateTo(this.dataset.page);

        });

    });


/* =====================================================
   MENU MOBILE
===================================================== */

const mobileMenuButton =
    document.getElementById(
        "mobileMenuButton"
    );


mobileMenuButton.addEventListener(
    "click",
    function () {

        document
            .querySelector(".sidebar")
            .classList.toggle("open");

    }
);


/* =====================================================
   LOCAL STORAGE
===================================================== */

function getAppointments() {

    return JSON.parse(
        localStorage.getItem(
            "bemPertoAppointments"
        ) || "[]"
    );

}


function saveAppointments(appointments) {

    localStorage.setItem(
        "bemPertoAppointments",
        JSON.stringify(appointments)
    );

}


/* =====================================================
   MAPA
===================================================== */

let map = null;

let mapMarkers = [];


function initializeMap() {

    if (map) {

        return;

    }


    map = L.map("map").setView(
        [-26.775, -51.015],
        14
    );


    L.tileLayer(
        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
            attribution:
                '&copy; OpenStreetMap contributors'
        }
    ).addTo(map);


    loadMapLocations();

}


/* =====================================================
   RENDER MAPA
===================================================== */

async function loadMapLocations() {

    if (locationLoadState !== "idle") {

        return;

    }


    locationLoadState = "loading";

    renderMapLocations("todos");


    const query = `
        [out:json][timeout:25];
        (
            nwr["amenity"~"^(hospital|clinic|pharmacy)$"](around:12000,-26.775,-51.015);
            nwr["healthcare"~"^(hospital|clinic|pharmacy|centre|primary_care)$"](around:12000,-26.775,-51.015);
        );
        out center tags;
    `;


    try {

        const endpoints = [
            "https://overpass-api.de/api/interpreter",
            "https://overpass.kumi.systems/api/interpreter"
        ];

        let result = null;
        let lastError = null;


        for (const endpoint of endpoints) {

            try {

                const response = await fetch(
                    `${endpoint}?data=${encodeURIComponent(query)}`,
                    {
                        headers: {
                            Accept: "application/json"
                        }
                    }
                );


                if (!response.ok) {

                    throw new Error(`Overpass respondeu com HTTP ${response.status}.`);

                }


                result = await response.json();

                break;


            } catch (error) {

                lastError = error;

            }

        }


        if (!result) {

            throw lastError || new Error("Falha ao consultar o OpenStreetMap.");

        }

        const seenLocations = new Set();


        result.elements.forEach(element => {

            const tags = element.tags || {};
            const name = tags.name || "";
            const healthcare = tags.healthcare || "";
            const amenity = tags.amenity || "";
            const isNamedUbs =
                /\bubs\b|unidade b[aá]sica|posto de sa[uú]de|centro de sa[uú]de/i
                    .test(name);

            let type = "";
            let typeName = "";


            if (
                amenity === "hospital" ||
                healthcare === "hospital"
            ) {

                type = "hospital";
                typeName = "Hospital";

            } else if (
                amenity === "pharmacy" ||
                healthcare === "pharmacy"
            ) {

                type = "farmacia";
                typeName = "Farmácia";

            } else if (
                isNamedUbs ||
                healthcare === "centre" ||
                healthcare === "primary_care"
            ) {

                type = "ubs";
                typeName = isNamedUbs ? "UBS" : "Unidade de saúde";

            }


            if (!type) {

                return;

            }


            const lat = element.lat ?? element.center?.lat;
            const lng = element.lon ?? element.center?.lon;
            const identity = `${element.type}/${element.id}`;


            if (
                !Number.isFinite(lat) ||
                !Number.isFinite(lng) ||
                seenLocations.has(identity)
            ) {

                return;

            }


            seenLocations.add(identity);


            const street = tags["addr:street"];
            const houseNumber = tags["addr:housenumber"];
            const neighborhood = tags["addr:suburb"];
            const city = tags["addr:city"] || "Caçador - SC";
            const streetAddress = street
                ? `${street}${houseNumber ? `, ${houseNumber}` : ""}`
                : "";
            const address = [
                streetAddress,
                neighborhood,
                city
            ].filter(Boolean).join(" - ") || "Caçador - SC";


            locations.push({
                name: name || `${typeName} sem nome cadastrado`,
                type,
                typeName,
                address,
                lat,
                lng,
                osmUrl: `https://www.openstreetmap.org/${identity}`
            });

        });


        locationLoadState = "loaded";


        if (locations.length) {

            const bounds = L.latLngBounds(
                locations.map(location => [
                    location.lat,
                    location.lng
                ])
            );

            map.fitBounds(bounds, {
                padding: [24, 24],
                maxZoom: 14
            });

        }


    } catch (error) {

        locationLoadState = "error";

        console.error("Erro ao carregar locais do OpenStreetMap:", error);

    }


    const activeFilter =
        document.querySelector(".filter.active")?.dataset.filter || "todos";

    renderMapLocations(activeFilter);

}


function escapeHtml(value) {

    return String(value).replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[character]);

}

function renderMapLocations(filter) {

    if (!map) {

        return;

    }


    mapMarkers.forEach(marker => {

        map.removeLayer(marker);

    });


    mapMarkers = [];


    const container =
        document.getElementById(
            "locationsContainer"
        );

    container.innerHTML = "";


    const filtered =
        filter === "todos"
            ? locations
            : locations.filter(
                location =>
                    location.type === filter
            );


    if (!filtered.length) {

        const emptyMessage = document.createElement("p");

        emptyMessage.className = "location-empty";
        emptyMessage.textContent = locationLoadState === "loading"
            ? "Carregando localização..."
            : locationLoadState === "error"
                ? "Não foi possível carregar os dados do OpenStreetMap. Verifique a conexão e recarregue a página para tentar novamente."
                : "Nenhum registro desta categoria foi encontrado no OpenStreetMap para esta região. A cobertura pode estar incompleta.";

        container.appendChild(emptyMessage);

        return;

    }


    filtered.forEach(location => {

        const marker =
            L.marker([
                location.lat,
                location.lng
            ]).addTo(map);


        marker.bindPopup(`
            <strong>${escapeHtml(location.name)}</strong>
            <br>
            ${escapeHtml(location.typeName)}
            <br>
            ${escapeHtml(location.address)}
        `);


        mapMarkers.push(marker);


        const item =
            document.createElement("div");

        item.className =
            "location-item";


        item.innerHTML = `

            <div class="location-item-header">

                <h3>
                    ${escapeHtml(location.name)}
                </h3>

                <span class="location-type">
                    ${escapeHtml(location.typeName)}
                </span>

            </div>

            <p>
                📍 ${escapeHtml(location.address)}
            </p>

        `;


        item.addEventListener(
            "click",
            function (event) {

                if (event.target.closest("a")) {

                    return;

                }

                map.setView(
                    [
                        location.lat,
                        location.lng
                    ],
                    16
                );

                marker.openPopup();

            }
        );


        container.appendChild(item);

    });

}


/* =====================================================
   FILTROS DO MAPA
===================================================== */

document
    .querySelectorAll(".filter")
    .forEach(button => {

        button.addEventListener(
            "click",
            function () {

                document
                    .querySelectorAll(".filter")
                    .forEach(btn => {

                        btn.classList.remove(
                            "active"
                        );

                    });


                this.classList.add("active");


                renderMapLocations(
                    this.dataset.filter
                );

            }
        );

    });


/* =====================================================
   AGENDAMENTO
===================================================== */

let bookingData = {

    service: null,

    professional: null,

    date: null,

    time: null

};


const steps =
    document.querySelectorAll(".step");


function updateBookingStep(number) {

    document
        .getElementById("bookingStep1")
        .classList.add("hidden");

    document
        .getElementById("bookingStep2")
        .classList.add("hidden");

    document
        .getElementById("bookingStep3")
        .classList.add("hidden");

    document
        .getElementById("bookingStep4")
        .classList.add("hidden");


    document
        .getElementById(
            `bookingStep${number}`
        )
        .classList.remove("hidden");


    steps.forEach(
        (step, index) => {

            step.classList.toggle(
                "active",
                index < number
            );

        }
    );

}


/* =====================================================
   SERVIÇO
===================================================== */

document
    .querySelectorAll(".service-option")
    .forEach(button => {

        button.addEventListener(
            "click",
            function () {

                bookingData.service =
                    this.dataset.service;

                renderProfessionals();

                updateBookingStep(2);

            }
        );

    });


/* =====================================================
   PROFISSIONAIS
===================================================== */

function renderProfessionals() {

    const container =
        document.getElementById(
            "professionalsContainer"
        );


    container.innerHTML = "";


    const list =
        professionals[
            bookingData.service
        ] || [];


    list.forEach(
        professional => {

            const button =
                document.createElement("button");

            button.className =
                "professional-option";


            button.innerHTML = `

                <div class="professional-avatar">
                    ${professional.icon}
                </div>

                <div>

                    <h3>
                        ${professional.name}
                    </h3>

                    <p>
                        ${professional.specialty}
                    </p>

                    <p>
                        📍 ${professional.location}
                    </p>

                </div>

            `;


            button.addEventListener(
                "click",
                function () {

                    document
                        .querySelectorAll(
                            ".professional-option"
                        )
                        .forEach(
                            item =>
                                item.classList.remove(
                                    "selected"
                                )
                        );


                    this.classList.add(
                        "selected"
                    );


                    bookingData.professional =
                        professional;


                    setTimeout(
                        () => {

                            updateBookingStep(3);

                        },
                        200
                    );

                }
            );


            container.appendChild(button);

        }
    );

}


/* =====================================================
   DATA MÍNIMA
===================================================== */

const appointmentDate =
    document.getElementById(
        "appointmentDate"
    );


const today =
    new Date();


today.setDate(
    today.getDate() + 1
);


appointmentDate.min =
    today.toISOString().split("T")[0];


/* =====================================================
   CONTINUAR AGENDAMENTO
===================================================== */

document
    .getElementById("continueBooking")
    .addEventListener(
        "click",
        function () {

            const date =
                appointmentDate.value;

            const time =
                document.getElementById(
                    "appointmentTime"
                ).value;


            if (!date || !time) {

                alert(
                    "Escolha a data e o horário."
                );

                return;

            }


            bookingData.date = date;

            bookingData.time = time;


            renderBookingSummary();

            updateBookingStep(4);

        }
    );


/* =====================================================
   RESUMO
===================================================== */

function formatDate(date) {

    const parts =
        date.split("-");

    return `${parts[2]}/${parts[1]}/${parts[0]}`;

}


function renderBookingSummary() {

    const summary =
        document.getElementById(
            "bookingSummary"
        );


    summary.innerHTML = `

        <div class="summary-row">

            <span>
                Serviço
            </span>

            <strong>
                ${bookingData.service}
            </strong>

        </div>


        <div class="summary-row">

            <span>
                Profissional
            </span>

            <strong>
                ${bookingData.professional.name}
            </strong>

        </div>


        <div class="summary-row">

            <span>
                Local
            </span>

            <strong>
                ${bookingData.professional.location}
            </strong>

        </div>


        <div class="summary-row">

            <span>
                Data
            </span>

            <strong>
                ${formatDate(bookingData.date)}
            </strong>

        </div>


        <div class="summary-row">

            <span>
                Horário
            </span>

            <strong>
                ${bookingData.time}
            </strong>

        </div>

    `;

}


/* =====================================================
   VOLTAR
===================================================== */

document
    .getElementById("backBooking")
    .addEventListener(
        "click",
        function () {

            updateBookingStep(3);

        }
    );


/* =====================================================
   CONFIRMAR AGENDAMENTO
===================================================== */

document
    .getElementById("confirmBooking")
    .addEventListener(
        "click",
        function () {

            const appointments =
                getAppointments();


            const appointment = {

                id:
                    Date.now(),

                service:
                    bookingData.service,

                professional:
                    bookingData.professional.name,

                location:
                    bookingData.professional.location,

                date:
                    bookingData.date,

                time:
                    bookingData.time,

                status:
                    "Confirmado",

                createdAt:
                    new Date().toISOString()

            };


            appointments.push(
                appointment
            );


            saveAppointments(
                appointments
            );


            alert(
                "Agendamento realizado com sucesso!"
            );


            bookingData = {

                service: null,

                professional: null,

                date: null,

                time: null

            };


            document
                .getElementById(
                    "appointmentDate"
                )
                .value = "";


            document
                .getElementById(
                    "appointmentTime"
                )
                .value = "";


            updateBookingStep(1);

            renderAppointments();

            updateNextAppointment();

            navigateTo("consultas");

        }
    );


/* =====================================================
   AGENDAMENTOS
===================================================== */

function renderAppointments() {

    const container =
        document.getElementById(
            "appointmentsContainer"
        );


    const appointments =
        getAppointments();


    container.innerHTML = "";


    if (appointments.length === 0) {

        container.innerHTML = `

            <div class="booking-card">

                <h2>
                    Nenhum agendamento encontrado.
                </h2>

                <p class="muted">
                    Seus próximos atendimentos
                    aparecerão aqui.
                </p>

                <button
                    class="primary-button"
                    data-page="agendamento"
                >
                    Agendar atendimento
                </button>

            </div>

        `;


        container
            .querySelector("button")
            .addEventListener(
                "click",
                () => navigateTo("agendamento")
            );


        return;

    }


    appointments
        .sort(
            (a, b) =>
                new Date(
                    `${a.date}T${a.time}`
                ) -
                new Date(
                    `${b.date}T${b.time}`
                )
        )
        .forEach(
            appointment => {

                const card =
                    document.createElement(
                        "div"
                    );


                card.className =
                    "appointment-card";


                card.style.marginBottom =
                    "12px";


                card.innerHTML = `

                    <div class="appointment-date">

                        <strong>
                            ${appointment.date.split("-")[2]}
                        </strong>

                        ${appointment.date.split("-")[1]}/
                        ${appointment.date.split("-")[0]}

                    </div>


                    <div class="appointment-info">

                        <h3>
                            ${appointment.service}
                        </h3>

                        <p>
                            👨‍⚕️ ${appointment.professional}
                        </p>

                        <p>
                            📍 ${appointment.location}
                        </p>

                        <p>
                            🕐 ${appointment.time}
                        </p>

                    </div>


                    <div>

                        <span class="status">
                            ${appointment.status}
                        </span>

                        <br>

                        <button
                            class="cancel-button"
                            data-id="${appointment.id}"
                        >
                            Cancelar
                        </button>

                    </div>

                `;


                container.appendChild(card);

            }
        );


    container
        .querySelectorAll(".cancel-button")
        .forEach(button => {

            button.style.marginTop =
                "10px";

            button.style.border =
                "none";

            button.style.background =
                "#fff0f1";

            button.style.color =
                "#d64552";

            button.style.padding =
                "7px 10px";

            button.style.borderRadius =
                "8px";

            button.style.fontSize =
                "11px";

            button.style.fontWeight =
                "700";


            button.addEventListener(
                "click",
                function () {

                    cancelAppointment(
                        Number(
                            this.dataset.id
                        )
                    );

                }
            );

        });

}


/* =====================================================
   CANCELAMENTO
===================================================== */

function cancelAppointment(id) {

    const appointments =
        getAppointments();


    const appointment =
        appointments.find(
            item => item.id === id
        );


    if (!appointment) {

        return;

    }


    const appointmentDateTime =
        new Date(
            `${appointment.date}T${appointment.time}`
        );


    const now =
        new Date();


    const difference =
        appointmentDateTime.getTime() -
        now.getTime();


    const hours =
        difference /
        (1000 * 60 * 60);


    if (hours < 24) {

        const confirmed =
            confirm(
                "Este atendimento está a menos de 24 horas. " +
                "Se você não comparecer sem cancelar dentro do prazo, " +
                "poderá receber uma advertência no sistema. " +
                "Deseja continuar com o cancelamento?"
            );


        if (!confirmed) {

            return;

        }

    }


    const updated =
        appointments.filter(
            item => item.id !== id
        );


    saveAppointments(updated);


    alert(
        "Agendamento cancelado."
    );


    renderAppointments();

    updateNextAppointment();

}


/* =====================================================
   PRÓXIMO AGENDAMENTO
===================================================== */

function updateNextAppointment() {

    const container =
        document.getElementById(
            "nextAppointment"
        );


    const appointments =
        getAppointments();


    if (appointments.length === 0) {

        container.innerHTML = `

            <div class="appointment-card">

                <div>

                    <h3>
                        Você não possui
                        próximos atendimentos.
                    </h3>

                    <p>
                        Agende uma consulta
                        quando precisar.
                    </p>

                </div>

                <button
                    class="primary-button"
                    data-page="agendamento"
                >
                    Agendar
                </button>

            </div>

        `;


        container
            .querySelector("button")
            .addEventListener(
                "click",
                () =>
                    navigateTo(
                        "agendamento"
                    )
            );


        return;

    }


    const sorted =
        [...appointments]
            .sort(
                (a, b) =>
                    new Date(
                        `${a.date}T${a.time}`
                    ) -
                    new Date(
                        `${b.date}T${b.time}`
                    )
            );


    const appointment =
        sorted[0];


    container.innerHTML = `

        <div class="appointment-card">

            <div class="appointment-date">

                <strong>
                    ${appointment.date.split("-")[2]}
                </strong>

                ${appointment.date.split("-")[1]}/
                ${appointment.date.split("-")[0]}

            </div>


            <div class="appointment-info">

                <h3>
                    ${appointment.service}
                </h3>

                <p>
                    ${appointment.professional}
                </p>

                <p>
                    📍 ${appointment.location}
                </p>

                <p>
                    🕐 ${appointment.time}
                </p>

            </div>


            <span class="status">
                ${appointment.status}
            </span>

        </div>

    `;

}


/* =====================================================
   ATENDIMENTO DOMICILIAR
===================================================== */

document
    .getElementById("homeCareForm")
    .addEventListener(
        "submit",
        function (event) {

            event.preventDefault();


            const professional =
                document.getElementById(
                    "homeCareProfessional"
                ).value;


            const reason =
                document.getElementById(
                    "homeCareReason"
                ).value;


            const date =
                document.getElementById(
                    "homeCareDate"
                ).value;


            const message =
                document.getElementById(
                    "homeCareMessage"
                );


            message.innerHTML = `

                ✓ Solicitação registrada!

                <br><br>

                Profissional:
                ${professional}

                <br>

                Data desejada:
                ${formatDate(date)}

                <br><br>

                <small>
                    Esta é uma simulação para
                    apresentação do projeto.
                </small>

            `;


            message.classList.remove(
                "hidden"
            );


            this.reset();

        }
    );


/* =====================================================
   IA
===================================================== */

const chatForm =
    document.getElementById(
        "chatForm"
    );


const chatInput =
    document.getElementById(
        "chatInput"
    );


const chatMessages =
    document.getElementById(
        "chatMessages"
    );


function addChatMessage(
    message,
    type
) {

    const div =
        document.createElement("div");


    div.className =
        `chat-message ${type}`;


    div.textContent =
        message;


    chatMessages.appendChild(div);


    chatMessages.scrollTop =
        chatMessages.scrollHeight;

}


function setTypingIndicator(isVisible) {

    const existingIndicator =
        document.querySelector(
            ".chat-message.typing"
        );


    if (isVisible) {

        if (existingIndicator) {
            return;
        }


        const typing =
            document.createElement("div");


        typing.className =
            "chat-message ai typing";


        typing.innerHTML = `
            <span class="typing-dots">
                <span></span>
                <span></span>
                <span></span>
            </span>
        `;


        chatMessages.appendChild(typing);
        chatMessages.scrollTop = chatMessages.scrollHeight;

        return;

    }


    if (existingIndicator) {
        existingIndicator.remove();
    }

}


function navigateFromAI(question) {

    const text = question.toLowerCase();

    if (
        text.includes("mapa") ||
        text.includes("hospital") ||
        text.includes("ubs") ||
        text.includes("farmácia") ||
        text.includes("farmacia")
    ) {

        navigateTo("mapa");

        const mapTarget =
            text.includes("hospital") ? "hospital" :
            text.includes("ubs") ? "ubs" :
            text.includes("farmácia") || text.includes("farmacia") ? "farmacia" : "todos";

        setTimeout(() => {

            const filterButton =
                document.querySelector(
                    `.filter[data-filter="${mapTarget}"]`
                );

            if (filterButton) {
                filterButton.click();
            }

        }, 220);

        return;

    }


    if (
        text.includes("consulta") ||
        text.includes("agendar") ||
        text.includes("marcar")
    ) {

        navigateTo("agendamento");
        return;

    }


    if (
        text.includes("domiciliar") ||
        text.includes("casa")
    ) {

        navigateTo("atendimento");
        return;

    }


    if (
        text.includes("agendamento") ||
        text.includes("meus agendamentos") ||
        text.includes("consultas")
    ) {

        navigateTo("consultas");
        return;

    }


    if (
        text.includes("perfil") ||
        text.includes("conta")
    ) {

        navigateTo("perfil");
        return;

    }

}


/* =====================================================
   RESPOSTA SIMULADA DA IA
===================================================== */

function getAIResponse(question) {

    const text =
        question.toLowerCase();


    if (
        text.includes("hospital") ||
        text.includes("mais perto")
    ) {

        navigateFromAI(question);

        return `
            Posso te ajudar com isso. O melhor caminho
            é abrir o mapa e filtrar por hospitais ou UBS.
            Também posso te indicar os serviços mais próximos
            conforme a sua região em Caçador - SC.
        `;

    }


    if (
        text.includes("farmácia") ||
        text.includes("farmacia") ||
        text.includes("remédio") ||
        text.includes("medicamento")
    ) {

        navigateFromAI(question);

        return `
            Para farmácias, o mais prático é abrir o mapa
            e selecionar o filtro "Farmácias". Lá você
            encontra pontos com medicamentos e atendimento
            rápido na região.
        `;

    }


    if (
        text.includes("consulta") ||
        text.includes("agendar") ||
        text.includes("marcar")
    ) {

        navigateFromAI(question);

        return `
            Claro! Você pode abrir a página de agendamento,
            escolher o serviço, o profissional e a data/horário.
            O BemPerto também oferece um resumo antes da confirmação.
        `;

    }


    if (
        text.includes("casa") ||
        text.includes("domiciliar") ||
        text.includes("em casa")
    ) {

        navigateFromAI(question);

        return `
            O atendimento domiciliar pode ser solicitado
            diretamente no menu "Atendimento domiciliar".
            Ele é ideal quando a pessoa tem dificuldade de locomoção
            ou precisa de cuidado em casa.
        `;

    }


    if (
        text.includes("agendamento") ||
        text.includes("meus agendamentos") ||
        text.includes("consultas")
    ) {

        navigateFromAI(question);

        return `
            Você pode acompanhar seus compromissos em
            "Meus agendamentos". Lá fica o histórico e os
            detalhes dos seus atendimentos.
        `;

    }


    if (
        text.includes("diabetes") ||
        text.includes("diabete") ||
        text.includes("sintoma") ||
        text.includes("dor") ||
        text.includes("febre")
    ) {

        return `
            Para sintomas ou dúvidas sobre saúde, vale lembrar
            que a IA informa e orienta, mas não substitui a consulta
            com um profissional. Se for um sintoma mais forte ou persistente,
            procure atendimento médico ou uma UBS/UBS mais próxima.
        `;

    }


    if (
        text.includes("bemperto") ||
        text.includes("ia") ||
        text.includes("assistente")
    ) {

        return `
            Eu posso te ajudar a localizar serviços de saúde,
            continuar um agendamento, orientar sobre atendimento domiciliar
            e explicar como usar as funções do BemPerto.
        `;

    }


    return `
        Posso ajudar você a encontrar serviços de saúde,
        agendar atendimentos e orientar sobre o uso do BemPerto.

        Experimente perguntar:
        "Qual hospital fica mais perto?"
        "Onde encontro uma farmácia?"
        "Quero marcar uma consulta."
    `;

}


function handleChatQuestion(question) {

    addChatMessage(question, "user");
    chatInput.value = "";
    setTypingIndicator(true);

    setTimeout(() => {

        setTypingIndicator(false);
        addChatMessage(getAIResponse(question), "ai");

    }, 700);

}


chatForm.addEventListener(
    "submit",
    function (event) {

        event.preventDefault();


        const question =
            chatInput.value.trim();


        if (!question) {

            return;

        }


        handleChatQuestion(question);

    }
);


/* =====================================================
   PERGUNTAS RÁPIDAS
===================================================== */

document
    .querySelectorAll(
        ".quick-questions button"
    )
    .forEach(button => {

        button.addEventListener(
            "click",
            function () {

                const question =
                    this.dataset.question;


                handleChatQuestion(question);

            }
        );

    });


/* =====================================================
   INICIALIZAÇÃO
===================================================== */

function initializeApplication() {

    navigateTo("home");

    initializeMap();

    renderAppointments();

    updateNextAppointment();

}


/* =====================================================
   INÍCIO
===================================================== */

document.addEventListener(
    "DOMContentLoaded",
    function () {

        /*
            Se quiser que o projeto sempre
            comece na tela de login,
            não fazemos nada aqui.
        */

    }
);