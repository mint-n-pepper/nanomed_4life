/*
* Magnetsiches Spielfeld mit Handlebit Joystick und Advancer Steuerung
*/
//% weight=10 icon="\uf11b" color=#424242 block="nanomed4life" 
namespace nanoMedForLife {
    let sideBeitrag = -1
    let hauptBeitrag = -1
    let visAvisSideKick = -1
    let visAvis = -1
    let sideKick = -1
    let hauptmagnet = -1
    let auslenkung = -1
    let winkel = -1
    let angle = -1
    let wippen = 1
    let magnetabstand = 1
    let vorzeichen = 1
    let modus = 0
    let offset_magnet = 2
    let radioGroup = 1
    let lastReceivedNumber = 0
    let speedFactor = 1
    let magnetJoystick = handlebit.Joystick.JOYSTICK_LEFT
    let advancerJoystick = handlebit.Joystick.JOYSTICK_RIGHT
   // let lastReceivedTime = control.millis()
    let dataReceived = false
    let motorPowerX = 0


    /**
     * Muss beim start zur Nutzung des Joysticks ausgeführt werden.
     */
    //% weight=86 blockId=initialize block="Initialisierung"
    export function init() {
        handlebit.initialize()
        //radio.setGroup(radioGroup)
        // basic.showNumber(radioGroup)
    }

    /**
     * Funktion für den Baustein «Wenn Knopf ... geklickt» 
     * Ändert die Ansteuerung einzelner Magnete zum Modus mit Gegenmagnet. Das Gegenmagnet erzeugt ein homogenes Magnetfeld wenn dazu die Dauermagnete «booster» ins Spielfeld eingesetzt sind. Dieser Modus ist speziell für die Challenge entwickelt.
     */
    //% weight=86 blockId=switchWippen block="Modus wechseln"
    export function switchWippen() {
        wippen = 1 - wippen
    }

    /**
     * Wenn in den Baustein «Wenn Knopf … geklickt» eingefügt schaltet der Modus Oszillieren ein / aus.
     */
    //% weight=86 blockId=switchModus block="Oszillation Ein/Aus"
    export function switchModus() {
        modus = 1 - modus
    }

    /**
     * Funktion für den Baustein «Wenn Knopf … geklickt» Diese Funktion verbreitert den Abstand der oszillierenden Magnete von 3 auf 5 Magnete wenn Oszillation Ein ist.
     */
    //% weight=86 blockId=setMagnetabstand block="Oszillations-bereich"
    export function setMagnetabstand() {
        magnetabstand = magnetabstand === 1 ? 2 : 1
        // if (magnetabstand === 1) {
        //     magnetabstand = 2
        // } else {
        //     magnetabstand = 1
        // }
    }

     /**
     * Funktion für den Baustein «Wenn Knopf … geklickt». Diese Funktion wechselt per Knopfdruck die Nord/ Süd- Polarität der Magnetspulen. Damit kann das Magnet in die Gegenrichtung navigiert werden. Dies ist beim Labyrinth eine erforderliche Funktion.
     */
    //% weight=86 blockId=switchPolarity block="wechsle Polarität der Magnetspulen"
    export function switchPolarity() {
        vorzeichen = -vorzeichen
    }

    /**
     * Dieser Baustein muss beim Sender und dem Empfänger “beim Start” gleich gesetzt sein. Dies definiert die Funkgruppen Nummer. Dieser Block ist für den Antrieb des Advancers nötig. Zusätzlich kann die Geschwindigkeit des Advancer Motors gesetzt werden.
     * @param frequency gewünschter Funkkanal
     */
    //% weight=86 blockId=setRadioGroup block="setze den Funkkanal auf |%frequency|"
    export function setRadioGroup(frequency: number) {
        radioGroup = frequency
        radio.setGroup(radioGroup)
        basic.showNumber(radioGroup)
    }

    /**
     * Führt eine Aktion aus wenn auf den gewünschten Knopf gedrückt wird.
     * @param button the button that needs to be pressed
     * @param body code to run when event is raised
     */
    //% weight=86 blockId=onButtonPressed block="wenn Knopf |%button| gedrückt"
    export function wrappedOnButtonPressed(button: handlebit.Button, body: Action) {
        control.onEvent(EventBusSource.MES_DPAD_CONTROLLER_ID, button, body)
    }

    /**
     * Funktion für den Baustein «Wenn Knopf … geklickt». Diese Funktion tauscht Joystick links und rechts. Diese Funktion ist nicht mehr in der Liste, da sie kaum gebraucht wird.
     */
    //% weight=86 blockId=swapJS block="Funktion der Joysticks tauschen"
    function swapJS() {
        let temp = magnetJoystick
        magnetJoystick = advancerJoystick
        advancerJoystick = temp
    }

    /**
     * Dieser Baustein empfängt beim Start Signale der gewählten Funknummer. Dieser Block ist für den Antrieb des Advancers nötig. Optional kann die Geschwindigkeit des Advancer Motors angepasst werden.
     * @param callback function.
     */
    //% weight=86 blockId=receivingValues block="Funksignal |%receivedNumber| Empfänger"
    // export function onReceivedNumberHadler(callback: (receivedNumber: number) => void): void {
    //     radio.onReceivedNumber(function (receivedNumber: number){
    //         lastReceivedNumber = receivedNumber
    //         callback(receivedNumber)
    //     })
    // }
    /**
     * Handle received number with a callback
     * @param optionsOrCallback Optional configuration object or callback function
     * @param callbackOrUndefined Optional callback function
     */
    //% weight=86 blockId=receivingValues block="empfange Wert für |%advancerSpeed|"
    export function onReceivedNumberHandler(
        optionsOrCallback: number | ((radvancerSpeed: number) => void),
        callbackOrUndefined?: (advancerSpeed: number) => void
    ): void {
        let actualCallback: (advancerSpeed: number) => void;

        if (typeof optionsOrCallback === 'function') {
            actualCallback = optionsOrCallback;
        } else if (typeof callbackOrUndefined === 'function') {
            actualCallback = callbackOrUndefined;
        } else {
            // Fallback in case no valid callback is provided
            actualCallback = function(advancerSpeed: number) {
                console.log("Received number: " + advancerSpeed);
            };
        }

        radio.onReceivedNumber(function (advancerSpeed: number) {
            lastReceivedNumber = advancerSpeed;
            dataReceived = true;
           // lastReceivedTime = control.millis();
            actualCallback(advancerSpeed);
        });
    }

    function getHauptMagnet(angle: number): number {
    if (angle < 45) return 7
    if (angle < 90) return 8
    if (angle < 135) return 1
    if (angle < 180) return 2
    if (angle < 225) return 3
    if (angle < 270) return 4
    if (angle < 315) return 5
    return 6
    }

    function calculateContributions(angle: number, deflection: number) {
        if (angle < 45) {
            sideKick = 8
            visAvis = 3
            visAvisSideKick = 4
            hauptBeitrag = deflection * Math.cos(2 * angle / 180 * Math.PI)
            sideBeitrag = deflection * Math.sin(2 * angle / 180 * Math.PI)
        } else if (angle < 90) {
            sideKick = 1
            visAvis = 4
            visAvisSideKick = 5
            hauptBeitrag = deflection * Math.cos(2 * (angle - 45) / 180 * Math.PI)
            sideBeitrag = deflection * Math.sin(2 * (angle - 45) / 180 * Math.PI)
        } else if (angle < 135) {
            sideKick = 2
            visAvis = 5
            visAvisSideKick = 6
            hauptBeitrag = deflection * Math.cos(2 * (angle - 90) / 180 * Math.PI)
            sideBeitrag = deflection * Math.sin(2 * (angle - 90) / 180 * Math.PI)
        } else if (angle < 180) {
            sideKick = 3
            visAvis = 6
            visAvisSideKick = 7
            hauptBeitrag = deflection * Math.cos(2 * (angle - 135) / 180 * Math.PI)
            sideBeitrag = deflection * Math.sin(2 * (angle - 135) / 180 * Math.PI)
        } else if (angle < 225) {
            sideKick = 4
            visAvis = 7
            visAvisSideKick = 8
            hauptBeitrag = deflection * Math.cos(2 * (angle - 180) / 180 * Math.PI)
            sideBeitrag = deflection * Math.sin(2 * (angle - 180) / 180 * Math.PI)
        } else if (angle < 270) {
            sideKick = 5
            visAvis = 8
            visAvisSideKick = 1
            hauptBeitrag = deflection * Math.cos(2 * (angle - 225) / 180 * Math.PI)
            sideBeitrag = deflection * Math.sin(2 * (angle - 225) / 180 * Math.PI)
        } else if (angle < 315) {
            sideKick = 6
            visAvis = 1
            visAvisSideKick = 2
            hauptBeitrag = deflection * Math.cos(2 * (angle - 270) / 180 * Math.PI)
            sideBeitrag = deflection * Math.sin(2 * (angle - 270) / 180 * Math.PI)
        } else {
            sideKick = 7
            visAvis = 2
            visAvisSideKick = 3
            hauptBeitrag = deflection * Math.cos(2 * (angle - 315) / 180 * Math.PI)
            sideBeitrag = deflection * Math.sin(2 * (angle - 315) / 180 * Math.PI)
        }
    }

    /**
     * Sendet die Werte von “Auslenkung” (Magnetstärke) und “Winkel” (Richtung, bzw Magnetnummer) des Joysticks an das magnetische Spielfeld via Kabel.
     * @param magnetJoystick
     */
    //% weight=86 blockId=setMagneticField block="Elektromagnete mit Joystick steuern"
    export function setMagneticField() {
        winkel = handlebit.getAngle(magnetJoystick)
        auslenkung = handlebit.getDeflection(magnetJoystick)
        MagneticNavigation.zeroAllMagnets()
        if (wippen) {
            offset_magnet = (offset_magnet == magnetabstand) ? 8 - magnetabstand : magnetabstand
            hauptmagnet = getHauptMagnet(winkel)
            MagneticNavigation.setMagnetPower(hauptmagnet, vorzeichen * auslenkung)
            if (modus) {
                if (magnetabstand == 2) {
                    MagneticNavigation.setMagnetPower((hauptmagnet + 1 - 1) % 8 + 1, vorzeichen * auslenkung)
                    MagneticNavigation.setMagnetPower((hauptmagnet + 7 - 1) % 8 + 1, vorzeichen * auslenkung)
                }
                MagneticNavigation.setMagnetPower((hauptmagnet + offset_magnet - 1) % 8 + 1, vorzeichen * auslenkung)
            }
        } else {
            hauptmagnet = getHauptMagnet(winkel)
            calculateContributions (winkel, auslenkung)
            MagneticNavigation.setMagnetPower(hauptmagnet, vorzeichen * hauptBeitrag)
            MagneticNavigation.setMagnetPower(sideKick, vorzeichen * sideBeitrag)
            MagneticNavigation.setMagnetPower(visAvis, -1 * vorzeichen * hauptBeitrag)
            MagneticNavigation.setMagnetPower(visAvisSideKick, -1 * vorzeichen * sideBeitrag)
        }
        MagneticNavigation.writeAll()
    }

    /**
     * Sendet die Werte von der Auslenkung (Magnetstärke) und des Winkels (Je nach Richtung die entsprechende Magnetnummer) vom Joystick an den zweiten Micro:bit, welcher den Advancer antreibt. Dieser microBit muss die selbe Funknummer aufrufen um das Signal zu erhalten.
     * 
     */
    //% weight=86 blockId=sendAdvancerCommand block="Advancer- Joystick"
    export function sendAdvancerCommand() {
        let advancerSpeed = handlebit.getSensorValue(handlebit.Direction.DIR_X, advancerJoystick)
        if (advancerSpeed > 2 || advancerSpeed < -2) {
            radio.sendNumber(advancerSpeed)
        } else {
            radio.sendNumber(0)
        }
    }

    /**
     * Dieser Block treibt den Motor des Advancers an, wenn dieser dem Empfänger hinzugefügt wird. Beachte, dass der "Empfänger" dieselbe Kanal Nummer wie der “Advancer Joystick" Sender aufweisen muss.
     * 
     */
    //% weight=86 blockId=setAdvancerSpeed block="Antrieb Advancer"
    export function setAdvancerSpeed() {
        if (dataReceived) {
            motorPowerX = speedFactor*lastReceivedNumber
            if (motorPowerX != 0) {
                motor.MotorRun(motor.Motors.M1, motor.Dir.CW, motorPowerX)
            } else {
                motor.motorStop(motor.Motors.M1)
            }
            dataReceived = false
        } else {
            motor.motorStop(motor.Motors.M1)
        }
    }
    

    /**
     * Dieser Block kann in «Dauerhaft» oder «Schleife alle 50ms» eingefügt werden. Optionaler Faktor (Wert zwischen 0.1 - 20 eintragen) um die erwünschte Maximalgeschwindigkeit zu setzen. Default =1
     *  @param speed
     * 
     */
    //% weight=86 blockId=setAdvancerSpeedFactor block="Advancer Geschwindigkeit |%speed|"
    export function setAdvancerSpeedFactor(speed: number) {
        speedFactor = speed
    }

     /**
     * Setze die Leistung für einen Elektromagneten.
     * Wenn der Index nicht zwischen 1 und 8 liegt wird kein Wert gesetzt und ein Ton ausgegeben.
     * @param index des Elektromagneten
     * @param leistung die der Elektromagnet abgeben soll
     */
    //% block="Setze Leistung für Elektromagnet $index auf $leistung"
    //% leistung.min=-100 leistung.max=100
    //% index.min=1 index.max=8
    //% leistung.defl=0
    //% index.defl=1
    export function setMagnetPowerNanomed(
        index?: number,
        leistung?: number) {
         MagneticNavigation.setMagnetPower(index, leistung)
    }

    /**
     * Setze Leistung für alle Elektromagnete auf 0
     */
    //% block="Setze Leistung für alle Elektromagnete auf 0"
    export function zeroAllMagnetsNanomed() {
        MagneticNavigation.zeroAllMagnets()
    }

     /**
     * Sende alle Leistungswerte zu den Motortreibern und aktiviere die Neopixel.
     * Muss immer ausgeführt werden wenn neu gesetzte Werte angezeigt werden sollen.
     */
    //% block="Sende alle Leistungswerte zum Spielfeld"
    export function writeAllNanomed() {
        MagneticNavigation.writeAll()
    }
}
