/*
gamepad package
*/
//% weight=10 icon="\uf11b" color=#d736ff block="Handlebit" 
namespace handlebit {
    export enum Button {
        //% block="B1"
        B1 = EventBusValue.MES_DPAD_BUTTON_2_DOWN,
        //% block="B2"
        B2 = EventBusValue.MES_DPAD_BUTTON_3_DOWN,
        //% block="Joystick links"
        JOYSTICK1 = EventBusValue.MES_DPAD_BUTTON_B_DOWN,
        //% block="Joystick rechts"
        JOYSTICK2 = EventBusValue.MES_DPAD_BUTTON_C_DOWN
    }

    export enum Direction {
        //% block="X"
        DIR_X,
        //% block="Y"
        DIR_Y
    }


    export enum Joystick {
        //% block="links"
        JOYSTICK_LEFT,
        //% block="rechts"
        JOYSTICK_RIGHT
    }

    let JoystickX1: number = -1;
    let JoystickX2: number = -1;
    let JoystickY1: number = -1;
    let JoystickY2: number = -1;
    let handleCmd: string = "";

    export function initialize() {
        serial.redirect(
            SerialPin.P12,
            SerialPin.P8,
            BaudRate.BaudRate115200);
        control.waitMicros(50);
        let buf = pins.createBuffer(4);
        buf[0] = 0x55;
        buf[1] = 0x55;
        buf[2] = 0x02;
        buf[3] = 0x5A;//cmd type
        serial.writeBuffer(buf);
        basic.forever(() => {
            getHandleCmd();
        });
    }


    /**
     * Get the handle command.
     */
    function getHandleCmd() {
        let charStr: string = serial.readString();
        handleCmd = handleCmd.concat(charStr);
        let cnt: number = countChar(handleCmd, "$");
        let startIndex: number = 0;
        if (cnt == 0)
            return;
        for (let i = 0; i < cnt; i++) {
            let index = findIndexof(handleCmd, "$", startIndex);
            if (index != -1) {
                let cmd: string = handleCmd.substr(startIndex, index - startIndex);
                if (cmd.charAt(0).compare("K") == 0 && cmd.length < 9) {
                    for (let j = 0; j < cmd.length - 1; j++) {
                        let args: string = cmd.substr(1 + j, 1);
                        let argsInt: number = strToNumber(args);
                        if (argsInt == -1) {
                            handleCmd = "";
                            return;
                        }
                        switch (argsInt) {
                            case 1:
                                control.raiseEvent(EventBusSource.MES_DPAD_CONTROLLER_ID, Button.B1);
                                break;

                            case 3:
                                control.raiseEvent(EventBusSource.MES_DPAD_CONTROLLER_ID, Button.B2);
                                break;

                            case 5:
                                control.raiseEvent(EventBusSource.MES_DPAD_CONTROLLER_ID, Button.JOYSTICK1);
                                break;

                            case 7:
                                control.raiseEvent(EventBusSource.MES_DPAD_CONTROLLER_ID, Button.JOYSTICK2);
                                break;

                            default:
                                break;
                        }
                    }
                }
                else if (cmd.charAt(0).compare("J") == 0 && cmd.length == 9) {
                    let args: string = cmd.substr(1, 2);
                    let argsInt: number = strToNumber(args);
                    if (argsInt == -1) {
                        handleCmd = "";
                        return;
                    }
                    //converting values to range [-100;100]
                    JoystickX1 = Math.floor(((128 - argsInt)*2-1)*100/255);

                    args = cmd.substr(3, 2);
                    argsInt = strToNumber(args);
                    if (argsInt == -1) {
                        handleCmd = "";
                        return;
                    }
                    JoystickY1 = Math.floor(((argsInt-128)*2+1)*100/255);

                    args = cmd.substr(5, 2);
                    argsInt = strToNumber(args);
                    if (argsInt == -1) {
                        handleCmd = "";
                        return;
                    }
                    JoystickX2 = Math.floor(((128 - argsInt)*2-1)*100/255);

                    args = cmd.substr(7, 2);
                    argsInt = strToNumber(args);
                    if (argsInt == -1) {
                        handleCmd = "";
                        return;
                    }
                    JoystickY2 = Math.floor(((argsInt-128)*2+1)*100/255);
                }
                startIndex = index + 1;
            }

        }
        if (cnt > 0) {
            handleCmd = "";
        }
    }

    function findIndexof(src: string, strFind: string, startIndex: number): number {
        for (let i = startIndex; i < src.length; i++) {
            if (src.charAt(i).compare(strFind) == 0) {
                return i;
            }
        }
        return -1;
    }

    function countChar(src: string, strFind: string): number {
        let cnt: number = 0;
        for (let i = 0; i < src.length; i++) {
            if (src.charAt(i).compare(strFind) == 0) {
                cnt++;
            }
        }
        return cnt;
    }

    /**
     * Do something when a button is pushed down and released again.
     * @param button the button that needs to be pressed
     * @param body code to run when event is raised
     */
    //% weight=86 blockId=onButtonPressed block="wenn Knopf |%button| gedrückt"
    export function onButtonPressed(button: Button, body: Action) {
        control.onEvent(EventBusSource.MES_DPAD_CONTROLLER_ID, button, body);
    }

    /**
     * Liest den Wert des gewünschten Joystick in die gewünschte Richtung. 
     * Die Werte liegen im Bereich -100 bis 100.
     */
    //% weight=84 blockId=getSensorValue block="|%direction|-Wert von Joystick |%joystick|"
    export function getSensorValue(direction: Direction, joystick: Joystick): number {
        let value: number = 0;
        if (joystick == Joystick.JOYSTICK_LEFT){
            if (direction == Direction.DIR_X) {
                value = JoystickX1;
            }
            else {
                value = JoystickY1;
            }
        }
        else {
            if (direction == Direction.DIR_X) {
                value = JoystickX2;
            }
            else {
                value = JoystickY2;
            }
        }
        return value;
    }

    function strToNumber(str: string): number {
        let num: number = 0;
        for (let i = 0; i < str.length; i++) {
            let tmp: number = converOneChar(str.charAt(i));
            if (tmp == -1)
                return -1;
            if (i > 0)
                num *= 16;
            num += tmp;
        }
        return num;
    }

    function converOneChar(str: string): number {
        if (str.compare("0") >= 0 && str.compare("9") <= 0) {
            return parseInt(str);
        }
        else if (str.compare("A") >= 0 && str.compare("F") <= 0) {
            if (str.compare("A") == 0) {
                return 10;
            }
            else if (str.compare("B") == 0) {
                return 11;
            }
            else if (str.compare("C") == 0) {
                return 12;
            }
            else if (str.compare("D") == 0) {
                return 13;
            }
            else if (str.compare("E") == 0) {
                return 14;
            }
            else if (str.compare("F") == 0) {
                return 15;
            }
            return -1;
        }
        else
            return -1;
    }
    
     /**
     * Berechnet den Winkelwert des gewünschten Joystick.
     * Die Werte liegen im Bereich 0 bis 360 Grad mit Definition am Einheitskreis.
     */
    //% blockId=getAngle block="Winkel Joystick |%joystick|"
    export function getAngle(joystick: Joystick) : number {
        let xWert = 0;
        let yWert = 0;

        if (joystick == Joystick.JOYSTICK_LEFT)
        {
            xWert = JoystickX1;
            yWert = JoystickY1;
        }
        else {
            xWert = JoystickX2;
            yWert = JoystickY2;
        }

        let value: number = 0;
        value = Math.round(Math.atan2(yWert,xWert)/Math.PI*180);
        // atan2() liefert Werte von 0° bis +180° für die ersten beiden Quadranten und dann
        // -180° bis -0° für den dritten und vierten Quadranten. 
        if (yWert < 0){
            value = 360 + value;
        }
        // Dead-band wenn keine Auslenkung
        if (getDeflection(joystick) < 3){ value = 0;}

        return value;
    }

    /**
     * Berechnet die Auslenkung des gewünschten Joystick.
     * Die Werte liegen im Bereich -100 bis 100.
     */
    //% blockId=getDeflection block="Auslenkung Joystick |%joystick|"
    export function getDeflection(joystick: Joystick): number {
        let value: number = 0;
        let x = 0;
        let y = 0;
        if (joystick == Joystick.JOYSTICK_LEFT) {
            x = JoystickX1;
            y = JoystickY1;
        }
        else {
            x = JoystickX2;
            y = JoystickY2;
        }
        value = Math.round(Math.sqrt(x*x+y*y));
        if (value > 100)
        {
            value=100;
        }
        return value;
    }
}

/*
Magnetisches Spielfeld Interface für steuern der Elektromagnete nanomed4life
*/
//% weight=10 icon="\uf192" color=#ff5733 block="Magnetisches Spielfeld" 
namespace MagneticNavigation {
    const MotorSpeedSet = 0x82
    const PWMFrequenceSet = 0x84
    const  DirectionSet = 0xaa
    const MotorSetA = 0xa1
    const MotorSetB = 0xa5
    const Nothing = 0x01
    const EnableStepper = 0x1a
    const UnenableStepper = 0x1b
    const Stepernu = 0x1c
    const BothClockWise = 0x0a
    const BothAntiClockWise = 0x05
    const M1CWM2ACW = 0x06
    const M1ACWM2CW = 0x09
    const I2CMotorDriverAdd = 0x0d
    let electromagnetDirection = [[0, 0], [0, 0], [0, 0], [0, 0]]
    let electromagnetOutput = [[0, 0], [0, 0], [0, 0], [0, 0]]
    const DriverAddress = [ 0x0B, 0x0C, 0x0D, 0x0A]
    let levelIndicatorLEDs = neopixel.create(DigitalPin.P2, 64, NeoPixelMode.RGB)

    class Watchdog {
        private timeout: number;
        private running: boolean = false;

        constructor(timeout: number ) {
            this.timeout = timeout;
        }

        start(): void {
            if (this.running) return;
            this.running = true;
            levelIndicatorLEDs.clear();
            this.monitor();
        }

        reset(): void {
            if (!this.running) return; 
            this.running = false;
            this.start();
        }

        stop(): void {
            this.running = false;
        }

        get_running(): boolean {
            return this.running;
        }

        private monitor(): void {
            control.inBackground(() => {
                let startTime = input.runningTime();
                basic.pause(this.timeout);
                if (this.running && input.runningTime() - startTime >= this.timeout) {
                    console.log("Watchdog timeout! Shutting down motors");
                    this.running = false;
                    zeroAllMagnets();
                    levelIndicatorLEDs.clear();
                    const timeoutColor = neopixel.rgb(255, 0, 255); // pink
                    while(!watchdog.get_running() && watchdog !== undefined){
                        levelIndicatorLEDs.showColor(timeoutColor);
                        basic.pause(250)
                        levelIndicatorLEDs.clear();
                        basic.pause(250)
                    }
                }
            });
        }
    }

    export const watchdog = new Watchdog(5000); /* TODO: adjust timeout to 5min when done with testing */ 
    watchdog.start();

    function resetI2CDevices(){
        let reset_pin = DigitalPin.P1;
        pins.digitalWritePin(reset_pin, 1);
        basic.pause(50);
        pins.digitalWritePin(reset_pin, 0);
        basic.pause(250);
    }

    /**
     * Sende Herzschlag an Watchdog Timer um Selbstabschaltung zu stoppen.
     */
    //% block="Sende Herzschlag"
    export function sendHeartbeat() {
        console.log("Watchdog timer reset.");
        watchdog.reset();
    }

    /**
     * Setze Leistung für alle Elektromagnete auf 0.
     */
    //% block="Setze Leistung für alle Elektromagnete auf 0"
    export function zeroAllMagnets() {
        electromagnetDirection = [[0, 0], [0, 0], [0, 0], [0, 0]]
        electromagnetOutput = [[0, 0], [0, 0], [0, 0], [0, 0]]
    }

    /**
     * Setze die Leistung für einzelnen Elektromagneten.
     * Der Index muss zwischen 1 und 8 liegen, ansonsten wird kein Wert gesetzt und ein Alarmton ausgegeben.
     * Leistungen im Plus-Bereich zwischen 0 < 100 erzeugen einen positiven Magnetismus (Nord/ rot).
     * Leistungen mit Minuswerten zwischen 0 < -100 erzeugen einen negativen Magnetismus (Süd/ grün).
     * @param index des Elektromagneten
     * @param leistung die der Elektromagnet abgeben soll
     */
    //% block="Setze Leistung für Elektromagnet $index auf $leistung"
    //% leistung.min=-100 leistung.max=100
    //% index.min=1 index.max=8
    //% leistung.defl=0
    //% index.defl=1
    export function setMagnetPower(
        index?: number,
        leistung?: number) {

        if (index >= 1 && index <= 8) {
            let motorDriverIdx = Math.floor((index - 1) / 2)
            let motorDriverPort = (index - 1) % 2

            // set new direction
            if (leistung < 0) {
                electromagnetDirection[motorDriverIdx][motorDriverPort] = 1
            } else {
                electromagnetDirection[motorDriverIdx][motorDriverPort] = 0
            }
            // set new speed
            electromagnetOutput[motorDriverIdx][motorDriverPort] = Math.abs(leistung)
            if (electromagnetOutput[motorDriverIdx][motorDriverPort] > 100) {
                electromagnetOutput[motorDriverIdx][motorDriverPort] = 100
            }
        }
        else {
            music.play(music.tonePlayable(262, music.beat(BeatFraction.Whole)), music.PlaybackMode.UntilDone)
        }
    }

    /**
     * Setze die Leistung für alle Elektromagneten.
     * Wenn die Arraylänge nicht 8 beträgt wird kein Wert gesetzt und ein Ton ausgegeben.
     * @param magnetLevels Array mit 8 Leistungswerten im Bereich [-100;100]
     */
    //% block="Setze die Werte für alle Elektromagnete: $magnetLevels"
    function setAllMagnetPowers(magnetLevels: number[]): void {
        if (magnetLevels.length == 8) {
            for (let idx = 0; idx < 8; idx++) {
                setMagnetPower(idx + 1, magnetLevels[idx])
            }
        }
        else {
            music.play(music.tonePlayable(262, music.beat(BeatFraction.Whole)), music.PlaybackMode.UntilDone)
        }
    }

    /**
     * Sende alle Leistungswerte zu den Motortreibern und aktiviere die Neopixel.
     * Muss immer ausgeführt werden wenn neu gesetzte Werte angezeigt werden sollen.
     */
    //% block="Sende alle Leistungswerte zum Spielfeld"
    export function writeAll() {
        let directionBuffer = pins.createBuffer(3)
        let speedBuffer = pins.createBuffer(3)

        if(!watchdog.get_running()){
            /* Prevent writing values to magnet coils if watchdog timer is lapsed */
            return;
        }
               
        //set led strips
        levelIndicatorLEDs.clear();
        let motorIdx=0;
        let ledStartIdx=0;
        for (let driverIdx = 0; driverIdx < 4; driverIdx++) {
            //set direction buffer
            directionBuffer[0] = DirectionSet
            if (electromagnetDirection[driverIdx][0] == 0 && electromagnetDirection[driverIdx][1] == 0) {
                directionBuffer[1] = BothAntiClockWise
            } else if (electromagnetDirection[driverIdx][0] == 0 && electromagnetDirection[driverIdx][1] == 1) {
                directionBuffer[1] = M1ACWM2CW
            } else if (electromagnetDirection[driverIdx][0] == 1 && electromagnetDirection[driverIdx][1] == 0) {
                directionBuffer[1] = M1CWM2ACW
            } else {
                //both are forward (1)
                directionBuffer[1] = BothClockWise
            }
            directionBuffer[2] = Nothing
            let status;
            status = pins.i2cWriteBuffer(DriverAddress[driverIdx], directionBuffer, false)

            if (status != 0){ resetI2CDevices(); }

            basic.pause(1)

            //set power
            let scaling_pwm = 2.55 * 0.85;
            speedBuffer[0] = MotorSpeedSet
            speedBuffer[1] = Math.floor(electromagnetOutput[driverIdx][0]*scaling_pwm)
            speedBuffer[2] = Math.floor(electromagnetOutput[driverIdx][1]*scaling_pwm)
            status = pins.i2cWriteBuffer(DriverAddress[driverIdx], speedBuffer, false)

            if (status != 0){ resetI2CDevices(); }

            //set all LED lights
            for (let portIdx = 0; portIdx < 2; portIdx++) {
                motorIdx=driverIdx*2+portIdx

                // Since we want angle zero to be on index 1 (first coil), we also have
                // to adjust the LED index. 
                if (motorIdx == 6){
                    ledStartIdx=0
                }
                else if( motorIdx == 7){
                    ledStartIdx=8
                }
                else{
                    // Skip first two LED bars which are physically connected first.
                    ledStartIdx=motorIdx*8 + (2 * 8)
                }

                let colorChoice = neopixel.rgb(0, 255, 0)
                if (electromagnetDirection[driverIdx][portIdx]>0) {
                    colorChoice = neopixel.rgb(255, 0, 0)
                      }
                if (electromagnetOutput[driverIdx][portIdx] > 10) {
                    levelIndicatorLEDs.setPixelColor(ledStartIdx+3, colorChoice)
                    levelIndicatorLEDs.setPixelColor(ledStartIdx+4, colorChoice)
                }
                if (electromagnetOutput[driverIdx][portIdx] > 40) {
                    levelIndicatorLEDs.setPixelColor(ledStartIdx+2, colorChoice)
                    levelIndicatorLEDs.setPixelColor(ledStartIdx+5, colorChoice)
                }
                if (electromagnetOutput[driverIdx][portIdx] > 70) {
                    levelIndicatorLEDs.setPixelColor(ledStartIdx+1, colorChoice)
                    levelIndicatorLEDs.setPixelColor(ledStartIdx+6, colorChoice)
                }
                if (electromagnetOutput[driverIdx][portIdx] > 95) {
                    levelIndicatorLEDs.setPixelColor(ledStartIdx, colorChoice)
                    levelIndicatorLEDs.setPixelColor(ledStartIdx+7, colorChoice)
                }
            }
            basic.pause(1)
        }

        levelIndicatorLEDs.show()
    }
}

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
    let motorPowerX = 0

    const number_of_magnets = 8;
    const angle_btwn_magnets = 360.0 / number_of_magnets;


    export function init() {
        handlebit.initialize()
        //radio.setGroup(radioGroup)
        // basic.showNumber(radioGroup)
    }

    /**
     * Funktion für den Baustein «Wenn Knopf ... geklickt» 
     * Ändert die Ansteuerung einzelner Magnete zum Modus mit Gegenmagnet.
     * Das Gegenmagnet erzeugt ein homogenes Magnetfeld wenn dazu 
     * die Dauermagnete «booster» ins Spielfeld eingesetzt sind.
     * Dieser Modus ist speziell für die Challenge entwickelt.
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
     * Funktion für den Baustein «Wenn Knopf … geklickt»
     * Diese Funktion verbreitert den Abstand der oszillierenden
     * Magnete von 3 auf 5 Magnete wenn Oszillation Ein ist.
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
     * Funktion für den Baustein «Wenn Knopf … geklickt». 
     * Diese Funktion wechselt per Knopfdruck die Nord/ Süd- Polarität der Magnetspulen.
     * Damit kann das Magnet in die Gegenrichtung navigiert werden.
     * Dies ist beim Labyrinth eine erforderliche Funktion.
     */
    //% weight=86 blockId=switchPolarity block="wechsle Polarität der Magnetspulen"
    export function switchPolarity() {
        vorzeichen = -vorzeichen
    }

    /**
     * Dieser Baustein muss beim Sender und dem Empfänger “beim Start” gleich gesetzt sein.
     * Dies definiert die Funkgruppen Nummer.
     * Dieser Block ist für den Antrieb des Advancers nötig.
     * Zusätzlich kann die Geschwindigkeit des Advancer Motors gesetzt werden.
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
     * Funktion für den Baustein «Wenn Knopf … geklickt».
     * Diese Funktion tauscht Joystick links und rechts.
     * Diese Funktion ist nicht mehr in der Liste, da sie kaum gebraucht wird.
     */
    //% weight=86 blockId=swapJS block="Funktion der Joysticks tauschen"
    function swapJS() {
        let temp = magnetJoystick
        magnetJoystick = advancerJoystick
        advancerJoystick = temp
    }

    /**
     * Handle received number with a callback
     * @param optionsOrCallback Optional configuration object or callback function
     * @param callbackOrUndefined Optional callback function
     */
    //% weight=86 blockId=receivingValues block="empfange Wert für advancerSpeed"
    export function onReceivedNumberHandler( callback: Action
    ): void {
        radio.onReceivedNumber(function (advancerSpeed: number) {
            lastReceivedNumber = advancerSpeed;
            callback();
        });
    }

    function getHauptMagnet(angle: number): number {
        control.assert(angle >= 0, "Angle must be positive!");

        let angle_offset = angle + (angle_btwn_magnets / 2);
        let index = Math.floor(angle_offset / angle_btwn_magnets)

        /* Correction for roll-over */
        index = index % number_of_magnets;

        /* Correction because index starts at 1 (and not zero) */
        let index_result = index + 1;
        control.assert(index_result >= 1 && index_result <= 8, "Hauptmagnet out of boundaries: " + index_result + "for angle :" + angle);

        return index_result;
    }

    function calculateContributions(angle: number, deflection: number) {
        let magnet_i = getHauptMagnet(angle);

        /* are we in the uppper or lower segment away from the main magnet? */

        control.assert(number_of_magnets % 2 == 0, "Number of magnets must be even!");
        let distance_opposite_magnet = number_of_magnets / 2;

        if (angle >= ((magnet_i - 1) * angle_btwn_magnets)){
            /* upper segment */
            sideKick = (magnet_i % number_of_magnets) + 1;
            visAvis = ((magnet_i + distance_opposite_magnet - 1) % number_of_magnets) + 1; 
            visAvisSideKick = (visAvis  % number_of_magnets) + 1;
        }
        else{
            /* lower segment */
            sideKick = ((magnet_i + (number_of_magnets - 1) - 1) % number_of_magnets) + 1;
            visAvis = ((magnet_i + distance_opposite_magnet - 1) % number_of_magnets) + 1; 
            visAvisSideKick = ((sideKick - 1 + distance_opposite_magnet) % number_of_magnets) + 1;
        }

        let angle_offset = 0;
        if (angle > (360 - 22.5) && angle <=360){
            angle_offset = 0;
        }else{
            angle_offset = Math.floor((angle + 22.5) / 45) * 45
        }
            hauptBeitrag = Math.abs(deflection * Math.cos(2 * Math.PI / 360 * (angle - angle_offset) * 2))
            sideBeitrag = Math.abs(deflection * Math.sin(2 * Math.PI / 360 * (angle - angle_offset) * 2))
    }

    /**
     * Sendet die Werte von “Auslenkung” (Magnetstärke) und 
     * “Winkel” (Richtung, bzw Magnetnummer) des Joysticks an 
     * das magnetische Spielfeld via Kabel.
     * @param magnetJoystick
     */
    //% weight=86 blockId=setMagneticField block="Elektromagnete mit Joystick steuern"
    export function setMagneticField() {
        winkel = handlebit.getAngle(magnetJoystick)
        auslenkung = handlebit.getDeflection(magnetJoystick)
        MagneticNavigation.zeroAllMagnets()
        MagneticNavigation.watchdog.reset();
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
     * Sendet die Werte von der Auslenkung (Magnetstärke) und des 
     * Winkels (je nach Richtung die entsprechende Magnetnummer) 
     * vom Joystick an den zweiten Micro:bit, welcher den Advancer antreibt.
     * Dieser microBit muss die selbe Funknummer aufrufen um das Signal zu erhalten.
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
     * Dieser Block treibt den Motor des Advancers an, wenn dieser dem Empfänger hinzugefügt wird.
     * Beachte, dass der "Empfänger" dieselbe Kanal Nummer wie der “Advancer Joystick" Sender aufweisen muss.
     */
    //% weight=86 blockId=setAdvancerSpeed block="Antrieb Advancer"
    export function setAdvancerSpeed() {
            motorPowerX = speedFactor*lastReceivedNumber
            if (motorPowerX != 0) {
                motor.MotorRun(motor.Motors.M1, motor.Dir.CW, motorPowerX)
            } else {
                motor.motorStop(motor.Motors.M1)
            }
    }

    /**
     * Dieser Block kann in «Dauerhaft» oder «Schleife alle 50ms» eingefügt werden.
     * Optionaler Faktor (Wert zwischen 0.1 - 20 eintragen) um die erwünschte Maximalgeschwindigkeit zu setzen.
     * Default =1
     *  @param speed
     */
    //% weight=86 blockId=setAdvancerSpeedFactor block="Advancer Geschwindigkeit |%speed|"
    export function setAdvancerSpeedFactor(speed: number) {
        speedFactor = speed
    }


    let run_testcase = true;
    if(run_testcase){
        console.log("Test case is set active")
        //const test_angles = [0, 45, 90, 135, 180, 225, 270, 315, 360 ];
        const test_deflection = 100;
        for (let i = 0; i <= 360; i++) {
            console.log("Run test for angle: " + i);
            hauptmagnet = getHauptMagnet(i);
            calculateContributions(i, test_deflection);
            // In one edge case, the alarm tone is hearable. 
            // This means, one index is out of boundary. Let's find it:
            control.assert(hauptmagnet >= 1 && hauptmagnet <= 8,"Hauptmagnet out of boundaries: "+ hauptmagnet );
            control.assert(sideKick >= 1 && sideKick <= 8, "sideKick out of boundaries: " + sideKick );
            control.assert(visAvis >= 1 && visAvis <= 8, "visAvis out of boundaries: " + visAvis);
            control.assert(visAvisSideKick >= 1 && visAvisSideKick <= 8, "visAvisSideKick out of boundaries: " + visAvisSideKick);
            }
    }
}




console.log("Init HW...");
nanoMedForLife.init();
