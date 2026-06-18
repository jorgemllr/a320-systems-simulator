/* ==========================================================================
   AIRBUS A320 SIMULATOR LOGIC - ATA 36 / 21 / 30 / 29
   ========================================================================== */

document.addEventListener("DOMContentLoaded", () => {
    // ─── ESTADO GLOBAL DEL SIMULADOR ───
    const state = {
        // Motores y APU
        engines: {
            1: { running: true, pressure: 44, temp: 200, n1: 66.5, n2: 82.1, ff: 322, oil: 62 },
            2: { running: true, pressure: 44, temp: 200, n1: 66.5, n2: 82.1, ff: 322, oil: 62 }
        },
        apu: { running: false, starting: false, pressure: 0, rpm: 0, egt: 20 },
        
        // Configuración de Controles (Overhead)
        controls: {
            pack1: true,        // true = ON (lights out), false = OFF (OFF lit)
            pack2: true,
            hotAir: true,
            eng1Bleed: true,
            eng2Bleed: true,
            apuBleed: false,    // false = OFF (lights out), true = ON (ON lit)
            ramAir: false,
            xBleed: 1,          // 0 = SHUT, 1 = AUTO, 2 = OPEN
            packFlow: 1,        // 0 = LO, 1 = NORM, 2 = HI
            
            // Anti Ice
            eng1AntiIce: false, // true = ON (ON lit)
            eng2AntiIce: false,
            wingAntiIce: false,
            
            // Hydraulics
            eng1Pump: true,
            eng2Pump: true,
            blueElec: true,
            yellowElec: false,  // false = OFF (OFF lit)
            ratDeployed: false
        },
        
        // Temperaturas de cabina
        temps: {
            ckptTarget: 20,
            fwdTarget: 21,
            aftTarget: 22,
            ckptCurrent: 20.0,
            fwdCurrent: 21.0,
            aftCurrent: 22.0
        },

        // Presiones Hidráulicas (PSI)
        hydraulics: {
            green: 3000,
            blue: 3000,
            yellow: 3000,
            ptuActive: false,
            greenResLevel: 100, // 0 to 100 %
            yellowResLevel: 100
        },

        // Presurización
        press: { outflowValve: 100, cabAlt: 150, deltaP: 0.0, vs: 0 },

        // Sistema Eléctrico
        elec: { gen1Load: 35, gen2Load: 35, apuGenLoad: 0, bat1V: 27.8, bat2V: 27.8 },

        // Combustible
        fuel: { lOut: 690, lIn: 2820, ctr: 1200, rIn: 2820, rOut: 690, fob: 8220 },

        // Fallas inyectadas
        failures: {
            eng1Fail: false,
            eng2Fail: false,
            apuFire: false,
            leakWAI: false,
            leakGreenRes: false,
            leakBleed: false,
            simIce: false
        },

        activePage: "bleed" // Página ECAM activa
    };

    // ─── ELEMENTOS DEL DOM ───
    const elements = {
        // Overhead
        btnPack1: document.getElementById("btn-pack1"),
        btnPack2: document.getElementById("btn-pack2"),
        btnHotAir: document.getElementById("btn-hotair"),
        btnEng1Bleed: document.getElementById("btn-eng1-bleed"),
        btnEng2Bleed: document.getElementById("btn-eng2-bleed"),
        btnApuBleed: document.getElementById("btn-apu-bleed"),
        btnRamAir: document.getElementById("btn-ram-air"),
        xBleedSelector: document.getElementById("x-bleed-selector"),
        packFlowSelector: document.getElementById("pack-flow-selector"),
        
        btnEng1AntiIce: document.getElementById("btn-eng1-antiice"),
        btnEng2AntiIce: document.getElementById("btn-eng2-antiice"),
        btnWingAntiIce: document.getElementById("btn-wing-antiice"),
        
        btnEng1Pump: document.getElementById("btn-eng1-pump"),
        btnEng2Pump: document.getElementById("btn-eng2-pump"),
        btnBlueElec: document.getElementById("btn-blue-elec"),
        btnYellowElec: document.getElementById("btn-yellow-elec"),
        ratGuard: document.getElementById("rat-guard"),
        btnRat: document.getElementById("btn-rat"),
        
        // ECP Buttons
        ecpButtons: {
            eng: document.getElementById("ecp-eng"),
            bleed: document.getElementById("ecp-bleed"),
            press: document.getElementById("ecp-press"),
            elec: document.getElementById("ecp-elec"),
            hyd: document.getElementById("ecp-hyd"),
            fuel: document.getElementById("ecp-fuel"),
            apu: document.getElementById("ecp-apu"),
            cond: document.getElementById("ecp-cond"),
            door: document.getElementById("ecp-door"),
            wheel: document.getElementById("ecp-wheel"),
            fctl: document.getElementById("ecp-fctl"),
            all: document.getElementById("ecp-all")
        },
        
        // ECAM Screen elements
        ecamTitle: document.getElementById("ecam-title"),
        ecamMemo: document.getElementById("ecam-memo"),
        pages: {
            eng: document.getElementById("page-eng"),
            bleed: document.getElementById("page-bleed"),
            press: document.getElementById("page-press"),
            elec: document.getElementById("page-elec"),
            hyd: document.getElementById("page-hyd"),
            fuel: document.getElementById("page-fuel"),
            apu: document.getElementById("page-apu"),
            cond: document.getElementById("page-cond"),
            door: document.getElementById("page-door"),
            wheel: document.getElementById("page-wheel"),
            fctl: document.getElementById("page-fctl"),
            dummy: document.getElementById("page-dummy")
        },

        // Alarmas Maestras
        masterCaution: document.getElementById("master-caution"),
        masterWarning: document.getElementById("master-warning"),

        // Consola del Instructor
        failEng1: document.getElementById("fail-eng1"),
        failEng2: document.getElementById("fail-eng2"),
        failApuFire: document.getElementById("fail-apufire"),
        failLeakWAI: document.getElementById("fail-leak-wai"),
        failLeakGreen: document.getElementById("fail-leak-green"),
        failLeakBleed: document.getElementById("fail-leak-bleed"),
        simIce: document.getElementById("sim-ice"),
        consoleOutput: document.getElementById("console-output")
    };

    // ─── EVENT LISTENERS ───
    
    // Switch de ECP para páginas ECAM
    const systemPageList = ["eng", "bleed", "press", "elec", "hyd", "fuel", "apu", "cond", "door", "wheel", "fctl"];
    let cycleIndex = 0;

    Object.keys(elements.ecpButtons).forEach(btnKey => {
        elements.ecpButtons[btnKey].addEventListener("click", () => {
            // Quitar clase activa a todos los botones ECP y páginas
            Object.values(elements.ecpButtons).forEach(btn => {
                if (btn) btn.classList.remove("active");
            });
            Object.values(elements.pages).forEach(page => {
                if (page) page.classList.remove("active");
            });
            
            // Activar selección de botón
            elements.ecpButtons[btnKey].classList.add("active");
            
            let targetPage = btnKey;
            if (btnKey === "all") {
                cycleIndex = (cycleIndex + 1) % systemPageList.length;
                targetPage = systemPageList[cycleIndex];
                logToConsole(`ECAM: Modo ALL - Ciclando a página ${targetPage.toUpperCase()}`);
            } else {
                state.activePage = btnKey;
                logToConsole(`ECAM: Página cambiada a ${btnKey.toUpperCase()}`);
            }
            
            // Mostrar la página correcta
            if (elements.pages[targetPage]) {
                elements.pages[targetPage].classList.add("active");
            } else {
                elements.pages.dummy.classList.add("active");
                document.getElementById("dummy-page-name").textContent = targetPage.toUpperCase();
            }
            
            elements.ecamTitle.textContent = (btnKey === "all" ? targetPage : btnKey).toUpperCase();
            
            if (btnKey === "all") {
                state.activePage = targetPage;
            }
            
            runSystemPhysics();
        });
    });

    // Botones Korry de Overhead (Bleed)
    setupKorryButton(elements.btnPack1, "pack1", true, "PACK 1");
    setupKorryButton(elements.btnPack2, "pack2", true, "PACK 2");
    setupKorryButton(elements.btnHotAir, "hotAir", true, "HOT AIR");
    setupKorryButton(elements.btnEng1Bleed, "eng1Bleed", true, "ENG 1 BLEED");
    setupKorryButton(elements.btnEng2Bleed, "eng2Bleed", true, "ENG 2 BLEED");
    setupKorryButton(elements.btnApuBleed, "apuBleed", false, "APU BLEED");
    
    // Custom RAM AIR button with grid cage guard
    const ramAirGuard = document.getElementById("ram-air-guard");
    if (ramAirGuard) {
        ramAirGuard.addEventListener("click", (e) => {
            e.stopPropagation();
            ramAirGuard.classList.toggle("open");
            logToConsole("OVERHEAD: Guarda de seguridad de RAM AIR accionada");
        });
    }

    elements.btnRamAir.addEventListener("click", () => {
        if (ramAirGuard && ramAirGuard.classList.contains("open")) {
            state.controls.ramAir = !state.controls.ramAir;
            const stateStr = state.controls.ramAir ? "ON" : "OFF";
            logToConsole(`OVERHEAD: Pulsador RAM AIR puesto en ${stateStr}`);
            runSystemPhysics();
        } else {
            logToConsole("OVERHEAD: Pulsador RAM AIR protegido por guarda.");
        }
    });

    // Botones Anti-Ice
    setupKorryButton(elements.btnEng1AntiIce, "eng1AntiIce", false, "ENG 1 ANTI ICE");
    setupKorryButton(elements.btnEng2AntiIce, "eng2AntiIce", false, "ENG 2 ANTI ICE");
    setupKorryButton(elements.btnWingAntiIce, "wingAntiIce", false, "WING ANTI ICE");
    
    // Botones Hidráulicos
    setupKorryButton(elements.btnEng1Pump, "eng1Pump", true, "ENG 1 PUMP");
    setupKorryButton(elements.btnEng2Pump, "eng2Pump", true, "ENG 2 PUMP");
    setupKorryButton(elements.btnBlueElec, "blueElec", true, "BLUE ELEC PUMP");
    setupKorryButton(elements.btnYellowElec, "yellowElec", false, "YELLOW ELEC PUMP");

    // Válvula Transversal X-BLEED Selector
    elements.xBleedSelector.addEventListener("click", () => {
        let pos = parseInt(elements.xBleedSelector.getAttribute("data-pos"));
        pos = (pos + 1) % 3;
        elements.xBleedSelector.setAttribute("data-pos", pos);
        state.controls.xBleed = pos;
        
        const labels = ["SHUT", "AUTO", "OPEN"];
        logToConsole(`OVERHEAD: Selector X-BLEED movido a ${labels[pos]}`);
        
        // Actualizar etiqueta activa
        const ticks = elements.xBleedSelector.querySelectorAll(".tick");
        ticks.forEach((tick, idx) => {
            if (idx === pos) tick.classList.add("active");
            else tick.classList.remove("active");
        });
        
        runSystemPhysics();
    });

    // Selector PACK FLOW
    elements.packFlowSelector.addEventListener("click", () => {
        let pos = parseInt(elements.packFlowSelector.getAttribute("data-pos"));
        pos = (pos + 1) % 3;
        elements.packFlowSelector.setAttribute("data-pos", pos);
        state.controls.packFlow = pos;
        
        const labels = ["LO", "NORM", "HI"];
        logToConsole(`OVERHEAD: Selector PACK FLOW movido a ${labels[pos]}`);
        
        const ticks = elements.packFlowSelector.querySelectorAll(".tick");
        ticks.forEach((tick, idx) => {
            if (idx === pos) tick.classList.add("active");
            else tick.classList.remove("active");
        });
        
        runSystemPhysics();
    });

    // Perillas de temperatura de cabina (clic para rotar y cambiar)
    const setupTempKnob = (id, stateKey) => {
        const knob = document.getElementById(id);
        knob.addEventListener("click", () => {
            let val = state.temps[stateKey];
            val = val + 1;
            if (val > 26) val = 18; // Rango 18°C a 26°C
            state.temps[stateKey] = val;
            
            // Rotar visualmente el knob basado en la temperatura
            const rotation = ((val - 18) / (26 - 18)) * 180 - 90; // -90deg a +90deg
            knob.querySelector(".knob").style.transform = `rotate(${rotation}deg)`;
            
            logToConsole(`OVERHEAD: Perilla de temperatura ${stateKey.replace("Target", "").toUpperCase()} ajustada a ${val}°C`);
            runSystemPhysics();
        });
    };
    setupTempKnob("temp-ckpt", "ckptTarget");
    setupTempKnob("temp-fwd", "fwdTarget");
    setupTempKnob("temp-aft", "aftTarget");

    // Guarda de protección del RAT Switch
    elements.ratGuard.addEventListener("click", (e) => {
        e.stopPropagation();
        elements.ratGuard.classList.toggle("open");
        logToConsole("OVERHEAD: Guarda de seguridad de descarga de RAT accionada");
    });

    // Pulsador del RAT
    elements.btnRat.addEventListener("click", () => {
        if (elements.ratGuard.classList.contains("open")) {
            state.controls.ratDeployed = true;
            elements.btnRat.classList.add("active");
            logToConsole("OVERHEAD: Botón RAT presionado. Ram Air Turbine desplegada neumáticamente.");
            runSystemPhysics();
        }
    });

    // ─── CONTROLADORES DE FALLAS (INSTRUCTOR) ───
    elements.failEng1.addEventListener("change", (e) => {
        state.failures.eng1Fail = e.target.checked;
        logToConsole(`INSTRUCTOR: Fallo de Motor 1 ${e.target.checked ? "ACTIVADO" : "DESACTIVADO"}`);
        runSystemPhysics();
    });
    elements.failEng2.addEventListener("change", (e) => {
        state.failures.eng2Fail = e.target.checked;
        logToConsole(`INSTRUCTOR: Fallo de Motor 2 ${e.target.checked ? "ACTIVADO" : "DESACTIVADO"}`);
        runSystemPhysics();
    });
    elements.failApuFire.addEventListener("change", (e) => {
        state.failures.apuFire = e.target.checked;
        logToConsole(`INSTRUCTOR: Fuego en APU ${e.target.checked ? "ACTIVADO (Parada de emergencia)" : "DESACTIVADO"}`);
        runSystemPhysics();
    });
    elements.failLeakWAI.addEventListener("change", (e) => {
        state.failures.leakWAI = e.target.checked;
        logToConsole(`INSTRUCTOR: Fuga neumática en Ala ${e.target.checked ? "ACTIVADA (Wing Overheat)" : "DESACTIVADA"}`);
        runSystemPhysics();
    });
    elements.failLeakGreen.addEventListener("change", (e) => {
        state.failures.leakGreenRes = e.target.checked;
        logToConsole(`INSTRUCTOR: Fuga en depósito hidráulico Verde ${e.target.checked ? "ACTIVADA" : "DESACTIVADA"}`);
        runSystemPhysics();
    });
    elements.failLeakBleed.addEventListener("change", (e) => {
        state.failures.leakBleed = e.target.checked;
        logToConsole(`INSTRUCTOR: Fuga neumática en Motor 1 (Bleed Leak) ${e.target.checked ? "ACTIVADA" : "DESACTIVADA"}`);
        runSystemPhysics();
    });
    elements.simIce.addEventListener("change", (e) => {
        state.failures.simIce = e.target.checked;
        logToConsole(`INSTRUCTOR: Simulación de condición de formación de hielo ${e.target.checked ? "ACTIVADA" : "DESACTIVADA"}`);
        runSystemPhysics();
    });

    // ─── MÉTODOS DE SOPORTE DE INTERFAZ ───
    function setupKorryButton(btnElement, stateKey, activeOnDefault, labelName) {
        if (!btnElement) return;
        btnElement.addEventListener("click", () => {
            const current = state.controls[stateKey];
            state.controls[stateKey] = !current;
            
            // Registro en consola
            const stateStr = state.controls[stateKey] ? (activeOnDefault ? "ON (Auto)" : "ON") : "OFF";
            logToConsole(`OVERHEAD: Pulsador ${labelName || stateKey.toUpperCase()} puesto en ${stateStr}`);
            
            runSystemPhysics();
        });
    }

    function logToConsole(message) {
        const timeStr = new Date().toLocaleTimeString();
        elements.consoleOutput.innerText = `[${timeStr}] ${message}\n` + elements.consoleOutput.innerText;
    }

    // ─── LÓGICA DE FÍSICA Y SISTEMAS DEL A320 ───
    function runSystemPhysics() {
        // 1. FÍSICA DE MOTORES Y APU
        // Motor 1
        if (state.failures.eng1Fail) {
            state.engines[1].running = false;
            state.engines[1].n1 = 0;
            state.engines[1].n2 = 0;
            state.engines[1].ff = 0;
            state.engines[1].oil = 0;
            state.engines[1].pressure = 0;
            state.engines[1].temp = 25;
        } else {
            state.engines[1].running = true;
            state.engines[1].n1 = 66.5;
            state.engines[1].n2 = 82.1;
            state.engines[1].ff = 322;
            state.engines[1].oil = 62;
            state.engines[1].pressure = 44;
            state.engines[1].temp = 200;
        }

        // Motor 2
        if (state.failures.eng2Fail) {
            state.engines[2].running = false;
            state.engines[2].n1 = 0;
            state.engines[2].n2 = 0;
            state.engines[2].ff = 0;
            state.engines[2].oil = 0;
            state.engines[2].pressure = 0;
            state.engines[2].temp = 25;
        } else {
            state.engines[2].running = true;
            state.engines[2].n1 = 66.5;
            state.engines[2].n2 = 82.1;
            state.engines[2].ff = 322;
            state.engines[2].oil = 62;
            state.engines[2].pressure = 44;
            state.engines[2].temp = 200;
        }

        // APU Transient Startup Physics
        if (state.controls.apuBleed && !state.failures.apuFire) {
            if (!state.apu.running && !state.apu.starting) {
                state.apu.starting = true;
                state.apu.rpm = 0;
                state.apu.egt = 20;
            }
            
            if (state.apu.starting) {
                state.apu.rpm = Math.min(100, state.apu.rpm + 20); // 5 seconds to start
                if (state.apu.rpm < 60) {
                    state.apu.egt = 20 + state.apu.rpm * 8; // rises up to 500C
                } else if (state.apu.rpm < 90) {
                    state.apu.egt = Math.min(620, state.apu.egt + 30); // spikes to 620C
                } else {
                    state.apu.egt = Math.max(380, state.apu.egt - 40); // cools to 380C
                }
                
                if (state.apu.rpm >= 100) {
                    state.apu.rpm = 100;
                    state.apu.starting = false;
                    state.apu.running = true;
                    state.apu.egt = 380;
                    state.apu.pressure = 38;
                }
            } else {
                state.apu.running = true;
                state.apu.pressure = 38;
                state.apu.egt = 380;
            }
        } else {
            state.apu.starting = false;
            state.apu.running = false;
            state.apu.pressure = 0;
            state.apu.rpm = Math.max(0, state.apu.rpm - 25);
            state.apu.egt = Math.max(20, state.apu.egt - 60);
        }

        // 2. FÍSICA NEUMÁTICA (BLEED - ATA 36)
        // Válvulas de sangrado abren si se comanda ON (latching/lights out = true) y el motor está corriendo
        const eng1BleedOpen = state.controls.eng1Bleed && state.engines[1].running && !state.failures.leakBleed;
        const eng2BleedOpen = state.controls.eng2Bleed && state.engines[2].running;
        const apuBleedOpen = state.controls.apuBleed && state.apu.running;

        // Válvula Crossbleed (X-FEED)
        let xBleedOpen = false;
        if (state.controls.xBleed === 2) {
            xBleedOpen = true; // OPEN
        } else if (state.controls.xBleed === 1) {
            // AUTO: Abre si la APU Bleed está abierta (Airbus Logic)
            xBleedOpen = apuBleedOpen;
        } // SHUT = false

        // Presiones en los colectores izquierdo y derecho
        let pManifoldL = 0;
        let pManifoldR = 0;

        if (eng1BleedOpen) pManifoldL = state.engines[1].pressure;
        if (apuBleedOpen) pManifoldL = Math.max(pManifoldL, state.apu.pressure);

        if (eng2BleedOpen) pManifoldR = state.engines[2].pressure;

        // Si crossbleed está abierta, se comunican las presiones
        if (xBleedOpen) {
            const maxPressure = Math.max(pManifoldL, pManifoldR);
            pManifoldL = maxPressure;
            pManifoldR = maxPressure;
        }

        // 3. FÍSICA DE CLIMATIZACIÓN (PACKS - ATA 21)
        // Un Pack abre si su botón está en AUTO (active=true) y hay presión neumática en su colector
        const pack1Open = state.controls.pack1 && pManifoldL > 0;
        const pack2Open = state.controls.pack2 && pManifoldR > 0;
        const mixerActive = pack1Open || pack2Open;

        // Variaciones de temperatura
        const updateCabinTemp = (currentKey, targetKey) => {
            const target = state.temps[targetKey];
            let current = state.temps[currentKey];
            
            if (mixerActive) {
                // Converge hacia el target
                if (current < target) current += 0.1;
                else if (current > target) current -= 0.1;
            } else {
                // Sin mixer, converge lentamente a la temp externa (SAT = -43°C)
                if (current > -43) current -= 0.15;
            }
            state.temps[currentKey] = parseFloat(current.toFixed(2));
        };
        updateCabinTemp("ckptCurrent", "ckptTarget");
        updateCabinTemp("fwdCurrent", "fwdTarget");
        updateCabinTemp("aftCurrent", "aftTarget");

        // 4. FÍSICA DE ANTI ICE (ATA 30)
        // Válvulas Wing Anti Ice (WAIV) abren si WING pb está en ON y hay presión en los colectores correspondientes
        const waiLeftOpen = state.controls.wingAntiIce && pManifoldL > 0 && !state.failures.leakWAI;
        const waiRightOpen = state.controls.wingAntiIce && pManifoldR > 0 && !state.failures.leakWAI;

        // Válvulas de motor abren si están en ON y los motores corren
        const eai1Open = state.controls.eng1AntiIce && state.engines[1].running;
        const eai2Open = state.controls.eng2AntiIce && state.engines[2].running;

        // 5. FÍSICA HIDRÁULICA (ATA 29)
        // Fuga en depósito verde
        if (state.failures.leakGreenRes) {
            state.hydraulics.greenResLevel = Math.max(0, state.hydraulics.greenResLevel - 5);
        } else {
            // Relleno automático en mantenimiento
            state.hydraulics.greenResLevel = Math.min(100, state.hydraulics.greenResLevel + 2);
        }

        // Presiones base por motores (Bombas EDP 1 y 2)
        const edp1Active = state.controls.eng1Pump && state.engines[1].running && state.hydraulics.greenResLevel > 15;
        const edp2Active = state.controls.eng2Pump && state.engines[2].running;

        let pGreen = edp1Active ? 3000 : 0;
        let pYellow = edp2Active ? 3000 : 0;

        // Bomba Eléctrica Azul (Siempre en AUTO en A320, da 3000 PSI si hay energía)
        let pBlue = 0;
        if (state.controls.blueElec && (state.engines[1].running || state.engines[2].running || state.apu.running)) {
            pBlue = 3000;
        }
        // RAT Desplegado (Presuriza el sistema Azul en vuelo si cae la potencia)
        if (state.controls.ratDeployed) {
            pBlue = 3000;
        }

        // Bomba Eléctrica Amarilla (Accionamiento manual)
        if (state.controls.yellowElec && (state.engines[1].running || state.engines[2].running || state.apu.running)) {
            pYellow = 3000;
        }

        // LÓGICA PTU (Power Transfer Unit - Bidireccional entre Verde y Amarillo)
        // Se activa automáticamente en A320 si la presión de Verde o Amarillo difiere por más de 500 PSI
        state.hydraulics.ptuActive = false;
        if (Math.abs(pGreen - pYellow) > 500) {
            // Requiere que ambos depósitos hidráulicos tengan fluido y que no haya fuego en motores
            if (state.hydraulics.greenResLevel > 15) {
                state.hydraulics.ptuActive = true;
                // Transfiere presión
                const maxP = Math.max(pGreen, pYellow) - 300; // Pérdida de 300 PSI por fricción mecánica
                pGreen = Math.max(pGreen, maxP);
                pYellow = Math.max(pYellow, maxP);
            }
        }

        state.hydraulics.green = pGreen;
        state.hydraulics.blue = pBlue;
        state.hydraulics.yellow = pYellow;

        // 5.5 CABIN PRESSURIZATION PHYSICS
        const packsRunning = pack1Open || pack2Open;
        const flightMode = state.engines[1].running && state.engines[2].running && packsRunning;
        
        let targetOFV = 100;
        if (flightMode) {
            targetOFV = 35;
        }
        
        // Outflow Valve modulation
        if (state.press.outflowValve > targetOFV) {
            state.press.outflowValve = Math.max(targetOFV, state.press.outflowValve - 15);
        } else if (state.press.outflowValve < targetOFV) {
            state.press.outflowValve = Math.min(targetOFV, state.press.outflowValve + 15);
        }
        
        // Cabin Alt and V/S
        if (state.press.outflowValve < 50) {
            if (state.press.cabAlt < 8000) {
                state.press.cabAlt = Math.min(8000, state.press.cabAlt + 250);
                state.press.vs = 250;
            } else {
                state.press.cabAlt = 8000;
                state.press.vs = 0;
            }
        } else {
            if (state.press.cabAlt > 150) {
                state.press.cabAlt = Math.max(150, state.press.cabAlt - 400);
                state.press.vs = -400;
            } else {
                state.press.cabAlt = 150;
                state.press.vs = 0;
            }
        }
        state.press.deltaP = parseFloat(((state.press.cabAlt - 150) / 7850 * 5.2).toFixed(1));

        // 5.6 ELECTRICAL GENERATOR LOADS BALANCING PHYSICS
        const gen1Avail = state.engines[1].running;
        const gen2Avail = state.engines[2].running;
        const apuGenAvail = state.apu.running && state.apu.rpm >= 100;
        
        if (gen1Avail && gen2Avail) {
            state.elec.gen1Load = 35;
            state.elec.gen2Load = 35;
            state.elec.apuGenLoad = 0;
            state.elec.bat1V = 27.8;
            state.elec.bat2V = 27.8;
        } else if (gen1Avail && !gen2Avail) {
            state.elec.gen1Load = apuGenAvail ? 35 : 70;
            state.elec.gen2Load = 0;
            state.elec.apuGenLoad = apuGenAvail ? 35 : 0;
            state.elec.bat1V = 27.8;
            state.elec.bat2V = 27.8;
        } else if (!gen1Avail && gen2Avail) {
            state.elec.gen1Load = 0;
            state.elec.gen2Load = apuGenAvail ? 35 : 70;
            state.elec.apuGenLoad = apuGenAvail ? 35 : 0;
            state.elec.bat1V = 27.8;
            state.elec.bat2V = 27.8;
        } else {
            state.elec.gen1Load = 0;
            state.elec.gen2Load = 0;
            if (apuGenAvail) {
                state.elec.apuGenLoad = 80;
                state.elec.bat1V = 27.8;
                state.elec.bat2V = 27.8;
            } else {
                state.elec.apuGenLoad = 0;
                // Drain batteries
                state.elec.bat1V = Math.max(22.0, parseFloat((state.elec.bat1V - 0.1).toFixed(1)));
                state.elec.bat2V = Math.max(22.0, parseFloat((state.elec.bat2V - 0.1).toFixed(1)));
            }
        }

        // 5.7 FUEL SYSTEM DYNAMICS
        const enginesRunning = state.engines[1].running || state.engines[2].running;
        if (enginesRunning) {
            state.fuel.lIn = Math.max(0, state.fuel.lIn - 1);
            state.fuel.rIn = Math.max(0, state.fuel.rIn - 1);
        }
        state.fuel.fob = state.fuel.lOut + state.fuel.lIn + state.fuel.ctr + state.fuel.rIn + state.fuel.rOut;

        // 6. CONTROL DE ALARMAS MAESTRAS (WARNING / CAUTION)
        let masterCautionActive = false;
        let masterWarningActive = false;

        // Caution: Fuga de WAI, Falla de motor, Fallo de bomba hidráulica, Icing sin WAI o Fuga Neumática de Bleed
        if (state.failures.leakWAI || state.failures.leakGreenRes || state.failures.leakBleed || !state.engines[1].running || !state.engines[2].running) {
            masterCautionActive = true;
        }
        // Warning: Fuego en APU
        if (state.failures.apuFire) {
            masterWarningActive = true;
        }

        // Actualizar estados visuales de alarmas
        elements.masterCaution.className = `status-indicator ${masterCautionActive ? "active" : ""}`;
        elements.masterWarning.className = `status-indicator ${masterWarningActive ? "active" : ""}`;

        // 7. ACTUALIZACIÓN GRÁFICA EN EL SIMULADOR
        updateVisualStates(eng1BleedOpen, eng2BleedOpen, apuBleedOpen, xBleedOpen, pack1Open, pack2Open, waiLeftOpen, waiRightOpen, eai1Open, eai2Open, edp1Active, edp2Active, pManifoldL, pManifoldR);
    }

    function updateVisualStates(eng1BleedOpen, eng2BleedOpen, apuBleedOpen, xBleedOpen, pack1Open, pack2Open, waiLeftOpen, waiRightOpen, eai1Open, eai2Open, edp1Active, edp2Active, pManifoldL, pManifoldR) {
        
        // ── ACTUALIZAR LUCES EN BOTONES OVERHEAD ──
        
        // Packs (lights out when ON, OFF in white when OFF) - inverted logic fixed
        toggleKorryLights(elements.btnPack1, !state.controls.pack1, "off", false);
        toggleKorryLights(elements.btnPack2, !state.controls.pack2, "off", false);
        toggleKorryLights(elements.btnHotAir, !state.controls.hotAir, "off", false);

        // Engine Bleeds (FAULT en ámbar si falla el motor con el bleed puesto, o si hay fuga)
        const bleed1Fault = (state.controls.eng1Bleed && !state.engines[1].running) || state.failures.leakBleed;
        const bleed2Fault = state.controls.eng2Bleed && !state.engines[2].running;
        toggleKorryLights(elements.btnEng1Bleed, !state.controls.eng1Bleed, "off", bleed1Fault);
        toggleKorryLights(elements.btnEng2Bleed, !state.controls.eng2Bleed, "off", bleed2Fault);

        // APU Bleed (ON en azul cuando está activado, FAULT si hay fuego)
        toggleKorryLights(elements.btnApuBleed, !state.controls.apuBleed, "on", state.failures.apuFire);

        // RAM AIR
        toggleKorryLights(elements.btnRamAir, !state.controls.ramAir, "on", false);

        // Anti Ice (ON en azul cuando se enciende)
        toggleKorryLights(elements.btnEng1AntiIce, !state.controls.eng1AntiIce, "on", false);
        toggleKorryLights(elements.btnEng2AntiIce, !state.controls.eng2AntiIce, "on", false);
        // Wing Anti Ice FAULT si hay una fuga neumática inyectada
        toggleKorryLights(elements.btnWingAntiIce, !state.controls.wingAntiIce, "on", state.failures.leakWAI);

        // Hydraulic Pumps (OFF en blanco. FAULT en ámbar si la presión es baja estando en AUTO)
        const pump1Fault = state.controls.eng1Pump && state.hydraulics.green < 1000;
        const pump2Fault = state.controls.eng2Pump && state.hydraulics.yellow < 1000;
        const blueFault = state.controls.blueElec && state.hydraulics.blue < 1000;
        
        toggleKorryLights(elements.btnEng1Pump, !state.controls.eng1Pump, "off", pump1Fault);
        toggleKorryLights(elements.btnEng2Pump, !state.controls.eng2Pump, "off", pump2Fault);
        toggleKorryLights(elements.btnBlueElec, !state.controls.blueElec, "off", blueFault);
        // Yellow Elec (OFF en blanco por defecto, se activa a ON)
        toggleKorryLights(elements.btnYellowElec, !state.controls.yellowElec, "on", false);

        // ── ACTUALIZAR SINÓPTICO ECAM BLEED (Pág. BLEED) ──
        if (state.activePage === "bleed") {
            // Manejar estilo FAULT ámbar en válvula de purga de motor 1 por fuga
            const valEng1Bleed = document.getElementById("val-eng1-bleed-sd");
            if (valEng1Bleed) {
                if (state.failures.leakBleed) {
                    valEng1Bleed.classList.add("fault");
                } else {
                    valEng1Bleed.classList.remove("fault");
                }
            }

            // Válvulas
            setValveState("val-eng1-bleed-sd", eng1BleedOpen);
            setValveState("val-eng2-bleed-sd", eng2BleedOpen);
            setValveState("val-apu-bleed-sd", apuBleedOpen);
            setValveState("val-xbleed-sd", xBleedOpen);
            setValveState("val-pack1-sd", pack1Open);
            setValveState("val-pack2-sd", pack2Open);
            setValveState("val-ramair-sd", state.controls.ramAir);
            setValveState("val-hp1-sd", false); // HP valves are normally closed
            setValveState("val-hp2-sd", false);

            // Flujos (Agregar/remover clase active para animar los conductos)
            setPathFlow("flow-left", eng1BleedOpen || (xBleedOpen && (eng2BleedOpen || apuBleedOpen)));
            setPathFlow("flow-right", eng2BleedOpen || (xBleedOpen && (eng1BleedOpen || apuBleedOpen)));
            setPathFlow("flow-hp1", false);
            setPathFlow("flow-hp2", false);
            setPathFlow("flow-apu", apuBleedOpen);
            setPathFlow("flow-xbleed", xBleedOpen && (eng1BleedOpen || eng2BleedOpen || apuBleedOpen));
            setPathFlow("flow-pack1", pack1Open);
            setPathFlow("flow-pack2", pack2Open);
            setPathFlow("flow-ramair", state.controls.ramAir);
            setPathFlow("flow-top-manifold", pack1Open || pack2Open);

            // Presiones y temperaturas
            document.getElementById("val-pres-l").textContent = eng1BleedOpen ? pManifoldL : 0;
            document.getElementById("val-pres-r").textContent = eng2BleedOpen ? pManifoldR : 0;
            document.getElementById("val-pres-apu").textContent = apuBleedOpen ? state.apu.pressure : 0;

            document.getElementById("val-temp-l").textContent = eng1BleedOpen ? state.engines[1].temp : 25;
            document.getElementById("val-temp-r").textContent = eng2BleedOpen ? state.engines[2].temp : 25;

            // Pack values
            const tempVal1 = pack1Open ? Math.round(state.temps.ckptCurrent) : 15;
            const compVal1 = pack1Open ? Math.round(state.temps.fwdCurrent * 3 + 15) : 15;
            const tempVal2 = pack2Open ? Math.round(state.temps.aftCurrent) : 15;
            const compVal2 = pack2Open ? Math.round(state.temps.aftCurrent * 3 + 15) : 15;

            document.getElementById("val-pack1-temp").textContent = tempVal1;
            document.getElementById("val-pack1-comp").textContent = compVal1;
            document.getElementById("val-pack2-temp").textContent = tempVal2;
            document.getElementById("val-pack2-comp").textContent = compVal2;

            // Dials needle rotations
            const needlePack1Temp = document.getElementById("needle-pack1-temp");
            const needlePack1Comp = document.getElementById("needle-pack1-comp");
            const needlePack2Temp = document.getElementById("needle-pack2-temp");
            const needlePack2Comp = document.getElementById("needle-pack2-comp");

            const rotTemp1 = pack1Open ? (((state.temps.ckptCurrent - 18) / (26 - 18)) * 120 - 60) : -60;
            const rotComp1 = pack1Open ? (((state.temps.fwdCurrent - 18) / (26 - 18)) * 120 - 60) : -60;
            const rotTemp2 = pack2Open ? (((state.temps.aftCurrent - 18) / (26 - 18)) * 120 - 60) : -60;
            const rotComp2 = pack2Open ? (((state.temps.aftCurrent - 18) / (26 - 18)) * 120 - 60) : -60;

            if (needlePack1Temp) needlePack1Temp.style.transform = `rotate(${rotTemp1}deg)`;
            if (needlePack1Comp) needlePack1Comp.style.transform = `rotate(${rotComp1}deg)`;
            if (needlePack2Temp) needlePack2Temp.style.transform = `rotate(${rotTemp2}deg)`;
            if (needlePack2Comp) needlePack2Comp.style.transform = `rotate(${rotComp2}deg)`;

            // Memos de Anti Ice
            toggleWaiIndicators(state.controls.wingAntiIce);
        }

        // ── ACTUALIZAR SINÓPTICO ECAM COND (Pág. COND) ──
        if (state.activePage === "cond") {
            setPathFlow("flow-cond-pack1", pack1Open);
            setPathFlow("flow-cond-pack2", pack2Open);
            setPathFlow("flow-mixer", pack1Open || pack2Open);
            setPathFlow("flow-cond-ckpt", pack1Open || pack2Open);
            setPathFlow("flow-cond-fwd", pack1Open || pack2Open);
            setPathFlow("flow-cond-aft", pack1Open || pack2Open);
            setPathFlow("flow-recirc1", true); // Fans siempre on
            setPathFlow("flow-recirc2", true);

            document.getElementById("cond-temp-ckpt").textContent = `${state.temps.ckptCurrent.toFixed(1)}°C`;
            document.getElementById("cond-temp-fwd").textContent = `${state.temps.fwdCurrent.toFixed(1)}°C`;
            document.getElementById("cond-temp-aft").textContent = `${state.temps.aftCurrent.toFixed(1)}°C`;
        }

        // ── ACTUALIZAR SINÓPTICO ECAM HYD (Pág. HYD) ──
        if (state.activePage === "hyd") {
            // Presiones numéricas
            document.getElementById("txt-pres-green").textContent = state.hydraulics.green;
            document.getElementById("txt-pres-blue").textContent = state.hydraulics.blue;
            document.getElementById("txt-pres-yellow").textContent = state.hydraulics.yellow;

            // Cambiar color de presiones si caen
            setPressureLabelColor("txt-pres-green", state.hydraulics.green);
            setPressureLabelColor("txt-pres-blue", state.hydraulics.blue);
            setPressureLabelColor("txt-pres-yellow", state.hydraulics.yellow);

            // EDPs y Bombas en el SVG
            setEcamPumpState("cir-edp1", "lbl-edp1", edp1Active, state.controls.eng1Pump);
            setEcamPumpState("cir-edp2", "lbl-edp2", edp2Active, state.controls.eng2Pump);
            setEcamPumpState("cir-blue", "lbl-blue", state.hydraulics.blue === 3000, state.controls.blueElec);
            setEcamPumpState("cir-yelec", "lbl-yelec", state.controls.yellowElec, !state.controls.yellowElec);

            // Depósitos (Reservoirs)
            updateReservoirVisual("rect-res-g", "txt-res-g", state.hydraulics.greenResLevel, "#00FF00");
            updateReservoirVisual("rect-res-y", "txt-res-y", state.hydraulics.yellowResLevel, "#FFCC00");

            // PTU
            const ptuRect = document.getElementById("rect-ptu");
            const ptuTxt = document.getElementById("txt-ptu");
            if (state.hydraulics.ptuActive) {
                ptuRect.setAttribute("stroke", "#00FF00");
                ptuTxt.setAttribute("fill", "#00FF00");
                setPathFlow("flow-ptu-l", true);
                setPathFlow("flow-ptu-r", true);
            } else {
                ptuRect.setAttribute("stroke", "#888888");
                ptuTxt.setAttribute("fill", "#888888");
                setPathFlow("flow-ptu-l", false);
                setPathFlow("flow-ptu-r", false);
            }

            // RAT
            const pLyRat = document.getElementById("ply-rat");
            const lblRat = document.getElementById("lbl-rat");
            if (state.controls.ratDeployed) {
                pLyRat.setAttribute("stroke", "#00FF00");
                lblRat.setAttribute("fill", "#00FF00");
            } else {
                pLyRat.setAttribute("stroke", "#888888");
                lblRat.setAttribute("fill", "#888888");
            }
        }

        // ── ACTUALIZAR SINÓPTICO ECAM APU (Pág. APU) ──
        if (state.activePage === "apu") {
            document.getElementById("apu-val-rpm").textContent = `${state.apu.rpm.toFixed(1)} %`;
            document.getElementById("apu-val-egt").textContent = `${state.apu.egt} °C`;
            
            const genText = document.getElementById("apu-val-gen");
            if (state.apu.rpm >= 100) {
                genText.textContent = "ON";
                genText.className = "val green";
                setValveState("val-apu-page", true);
            } else {
                genText.textContent = state.apu.starting ? "START" : "OFF";
                genText.className = "val amber";
                setValveState("val-apu-page", false);
            }
        }

        // ── ACTUALIZAR SINÓPTICO ECAM PRESS (Pág. PRESS) ──
        if (state.activePage === "press") {
            document.getElementById("press-val-ofv").textContent = `${state.press.outflowValve}% OPEN`;
            document.getElementById("press-val-alt").textContent = `${state.press.cabAlt} FT`;
            document.getElementById("press-val-vs").textContent = `${state.press.vs >= 0 ? "+" : ""}${state.press.vs} FPM`;
            document.getElementById("press-val-dp").textContent = `${state.press.deltaP} PSI`;
            
            const ofvTxt = document.getElementById("press-val-ofv");
            if (state.press.outflowValve < 100) {
                ofvTxt.setAttribute("fill", "#00FF00");
            } else {
                ofvTxt.setAttribute("fill", "#00D2FF");
            }
        }

        // ── ACTUALIZAR SINÓPTICO ECAM ENG (Pág. ENG) ──
        if (state.activePage === "eng") {
            // Motor 1
            document.getElementById("eng-val-n1-1").textContent = `${state.engines[1].n1.toFixed(1)}%`;
            document.getElementById("eng-val-n2-1").textContent = `${state.engines[1].n2.toFixed(1)}%`;
            document.getElementById("eng-val-egt-1").textContent = `${state.engines[1].temp}°C`;
            document.getElementById("eng-val-ff-1").textContent = state.engines[1].ff;
            document.getElementById("eng-val-oil-1").textContent = `${state.engines[1].oil} PSI`;
            
            setEngineLabelColor("eng-val-n1-1", state.engines[1].n1);
            setEngineLabelColor("eng-val-n2-1", state.engines[1].n2);
            
            // Motor 2
            document.getElementById("eng-val-n1-2").textContent = `${state.engines[2].n1.toFixed(1)}%`;
            document.getElementById("eng-val-n2-2").textContent = `${state.engines[2].n2.toFixed(1)}%`;
            document.getElementById("eng-val-egt-2").textContent = `${state.engines[2].temp}°C`;
            document.getElementById("eng-val-ff-2").textContent = state.engines[2].ff;
            document.getElementById("eng-val-oil-2").textContent = `${state.engines[2].oil} PSI`;

            setEngineLabelColor("eng-val-n1-2", state.engines[2].n1);
            setEngineLabelColor("eng-val-n2-2", state.engines[2].n2);
        }

        // ── ACTUALIZAR SINÓPTICO ECAM ELEC (Pág. ELEC) ──
        if (state.activePage === "elec") {
            const gen1Avail = state.engines[1].running;
            const gen2Avail = state.engines[2].running;
            const apuGenAvail = state.apu.running && state.apu.rpm >= 100;

            document.getElementById("elec-val-gen1-load").textContent = gen1Avail ? `${state.elec.gen1Load}%` : "OFF";
            document.getElementById("elec-val-gen1-load").setAttribute("fill", gen1Avail ? "#00FF00" : "#FF9900");
            document.getElementById("elec-val-gen1-v").textContent = gen1Avail ? "115 V  400 HZ" : "0 V  0 HZ";

            document.getElementById("elec-val-gen2-load").textContent = gen2Avail ? `${state.elec.gen2Load}%` : "OFF";
            document.getElementById("elec-val-gen2-load").setAttribute("fill", gen2Avail ? "#00FF00" : "#FF9900");
            document.getElementById("elec-val-gen2-v").textContent = gen2Avail ? "115 V  400 HZ" : "0 V  0 HZ";

            document.getElementById("elec-val-apugen-load").textContent = apuGenAvail ? (state.elec.apuGenLoad > 0 ? `${state.elec.apuGenLoad}%` : "0%") : "OFF";
            document.getElementById("elec-val-apugen-load").setAttribute("fill", apuGenAvail ? "#00FF00" : "#FF9900");
            document.getElementById("elec-val-apugen-v").textContent = apuGenAvail ? "115 V  400 HZ" : "0 V  0 HZ";

            document.getElementById("elec-val-bat1").textContent = `${state.elec.bat1V.toFixed(1)} V`;
            document.getElementById("elec-val-bat1").setAttribute("fill", state.elec.bat1V > 25 ? "#00FF00" : "#FF3333");
            document.getElementById("elec-val-bat2").textContent = `${state.elec.bat2V.toFixed(1)} V`;
            document.getElementById("elec-val-bat2").setAttribute("fill", state.elec.bat2V > 25 ? "#00FF00" : "#FF3333");
            
            const bus1Rect = document.getElementById("rect-ac-bus1");
            const bus2Rect = document.getElementById("rect-ac-bus2");
            if (gen1Avail || apuGenAvail) {
                bus1Rect.setAttribute("stroke", "#00FF00");
            } else {
                bus1Rect.setAttribute("stroke", "#FF9900");
            }
            if (gen2Avail || apuGenAvail) {
                bus2Rect.setAttribute("stroke", "#00FF00");
            } else {
                bus2Rect.setAttribute("stroke", "#FF9900");
            }
        }

        // ── ACTUALIZAR SINÓPTICO ECAM FUEL (Pág. FUEL) ──
        if (state.activePage === "fuel") {
            document.getElementById("fuel-val-l-out").textContent = `${state.fuel.lOut} kg`;
            document.getElementById("fuel-val-l-in").textContent = `${state.fuel.lIn} kg`;
            document.getElementById("fuel-val-ctr").textContent = `${state.fuel.ctr} kg`;
            document.getElementById("fuel-val-r-in").textContent = `${state.fuel.rIn} kg`;
            document.getElementById("fuel-val-r-out").textContent = `${state.fuel.rOut} kg`;
            document.getElementById("fuel-val-fob").textContent = `${state.fuel.fob} kg`;

            const enginesRunning = state.engines[1].running || state.engines[2].running;
            const p1 = enginesRunning ? "#00FF00" : "#888888";
            document.getElementById("fuel-pump-l1").setAttribute("stroke", p1);
            document.getElementById("fuel-pump-l2").setAttribute("stroke", p1);
            document.getElementById("fuel-pump-r1").setAttribute("stroke", p1);
            document.getElementById("fuel-pump-r2").setAttribute("stroke", p1);
            document.getElementById("fuel-pump-c1").setAttribute("stroke", state.apu.running ? "#00FF00" : "#888888");
            document.getElementById("fuel-pump-c2").setAttribute("stroke", state.apu.running ? "#00FF00" : "#888888");
        }

        // ── ACTUALIZAR SINÓPTICO ECAM DOOR (Pág. DOOR) ──
        if (state.activePage === "door") {
            document.getElementById("door-val-oxy").textContent = "1850 PSI";
        }

        // ── ACTUALIZAR SINÓPTICO ECAM WHEEL (Pág. WHEEL) ──
        if (state.activePage === "wheel") {
            // Landing gears green
        }

        // ── ACTUALIZAR SINÓPTICO ECAM F/CTL (Pág. F/CTL) ──
        if (state.activePage === "fctl") {
            // Flight controls neutral
        }

        // ── ACTUALIZAR MEMO / EXAMEN ──
        updateEcamMemos();
    }

    // Soporte para Korry lights
    function toggleKorryLights(btnElement, isOff, activeClass, isFault) {
        btnElement.classList.remove("off", "on", "fault");
        
        if (isFault) {
            btnElement.classList.add("fault");
        } else if (isOff) {
            if (activeClass === "off") {
                btnElement.classList.add("off");
            }
        } else {
            if (activeClass === "on") {
                btnElement.classList.add("on");
            }
        }
    }

    // Soporte para Válvulas
    function setValveState(id, isOpen) {
        const valGroup = document.getElementById(id);
        if (!valGroup) return;
        if (isOpen) {
            valGroup.classList.remove("closed");
            valGroup.classList.add("open");
        } else {
            valGroup.classList.remove("open");
            valGroup.classList.add("closed");
        }
    }

    // Soporte para flujos
    function setPathFlow(id, isActive) {
        const path = document.getElementById(id);
        if (!path) return;
        if (isActive) {
            path.classList.add("active");
        } else {
            path.classList.remove("active");
        }
    }

    // Cambiar color del valor de presión en ECAM
    function setPressureLabelColor(id, value) {
        const txt = document.getElementById(id);
        if (value >= 2800) {
            txt.setAttribute("fill", "#00FF00");
        } else if (value > 0) {
            txt.setAttribute("fill", "#FF9900");
        } else {
            txt.setAttribute("fill", "#FF3333");
        }
    }

    // Cambiar color del valor de motor en ECAM
    function setEngineLabelColor(id, value) {
        const txt = document.getElementById(id);
        if (value > 1.0) {
            txt.setAttribute("fill", "#00FF00");
        } else {
            txt.setAttribute("fill", "#FF3333");
        }
    }

    // Actualizar visualización del depósito
    function updateReservoirVisual(rectId, txtId, level, normalColor) {
        const rect = document.getElementById(rectId);
        const txt = document.getElementById(txtId);
        
        if (level < 20) {
            rect.setAttribute("stroke", "#FF3333");
            txt.setAttribute("fill", "#FF3333");
        } else if (level < 60) {
            rect.setAttribute("stroke", "#FF9900");
            txt.setAttribute("fill", "#FF9900");
        } else {
            rect.setAttribute("stroke", normalColor);
            txt.setAttribute("fill", normalColor);
        }
    }

    // Actualizar estado de bombas en el ECAM HYD
    function setEcamPumpState(cirId, lblId, isActive, isCommandedOn) {
        const cir = document.getElementById(cirId);
        const lbl = document.getElementById(lblId);
        
        const isOff = !isCommandedOn;
        
        if (isActive) {
            cir.setAttribute("stroke", "#00FF00");
            lbl.setAttribute("fill", "#00FF00");
        } else if (isOff) {
            cir.setAttribute("stroke", "#FFFFFF");
            lbl.setAttribute("fill", "#FFFFFF");
        } else {
            // Fault / Low pressure
            cir.setAttribute("stroke", "#FF9900");
            lbl.setAttribute("fill", "#FF9900");
        }
    }

    // Flechas WAI en ECAM Bleed (pink boxes)
    function toggleWaiIndicators(isActive) {
        const lInd = document.getElementById("wai-ind-l");
        const rInd = document.getElementById("wai-ind-r");
        
        if (lInd && rInd) {
            if (isActive && !state.failures.leakWAI) {
                lInd.style.opacity = "1";
                rInd.style.opacity = "1";
            } else {
                lInd.style.opacity = "0";
                rInd.style.opacity = "0";
            }
        }
    }

    // Gestionar el área de MEMO del ECAM
    function updateEcamMemos() {
        elements.ecamMemo.innerHTML = "";
        
        // Anti Ice
        if (state.controls.wingAntiIce && !state.failures.leakWAI) {
            addMemoItem("WING A.ICE", "green");
        }
        if (state.controls.eng1AntiIce || state.controls.eng2AntiIce) {
            addMemoItem("ENG A.ICE", "green");
        }
        
        // Icing condition warning
        if (state.failures.simIce) {
            addMemoItem("ICE DETECTED", "amber");
        }

        // Warnings y Caution
        if (state.failures.leakWAI) {
            addMemoItem("WING LEAK DET", "amber");
        }
        if (state.failures.apuFire) {
            addMemoItem("APU FIRE", "amber");
        }
        if (state.failures.leakGreenRes) {
            addMemoItem("G HYD LEAK", "amber");
        }
        if (state.hydraulics.ptuActive) {
            addMemoItem("PTU RUNNING", "green");
        }
    }

    function addMemoItem(text, priorityClass) {
        const span = document.createElement("span");
        span.className = `ecam-memo-item ${priorityClass}`;
        span.textContent = text;
        elements.ecamMemo.appendChild(span);
    }

    // ─── BUCLE DE EJECUCIÓN CONTINUO (CADA 1 SEGUNDO) ───
    setInterval(() => {
        // Reloj simulado
        const timeParts = document.getElementById("clock-time").textContent.split(":");
        let h = parseInt(timeParts[0]);
        let m = parseInt(timeParts[1]);
        let s = parseInt(timeParts[2]);
        
        s = (s + 1) % 60;
        if (s === 0) {
            m = (m + 1) % 60;
            if (m === 0) {
                h = (h + 1) % 24;
            }
        }
        
        document.getElementById("clock-time").textContent = 
            `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        
        runSystemPhysics();
    }, 1000);

    // Ejecución inicial de prueba
    runSystemPhysics();
    logToConsole("SISTEMA: Todos los prechequeos de las BMCs y los ACSCs completados.");
});
