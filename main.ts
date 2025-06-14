/*
gamepad package
*/
//% weight=10 icon="\uf11b" color=#999999 block="nanomed 4life Magnetspielfeld" 
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
    let firstRun = true;

    class Watchdog {
        private timeout: number;
        private running: boolean = false;
        private startTime: number ;

        constructor(timeout: number ) {
            this.timeout = timeout;
        }

        start(): void {
            this.startTime = input.runningTime();
            if (this.running) return;
            this.running = true;
            levelIndicatorLEDs.clear();
            control.inBackground(() => {
                basic.pause(this.timeout);
                if (this.running && input.runningTime() - this.startTime >= this.timeout) {
                    console.log("Watchdog timeout! Shutting down motors");
                    this.running = false;
                    zeroAllMagnets();
                    levelIndicatorLEDs.clear();
                    const timeoutColor = neopixel.rgb(255, 0, 255); // pink
                    while(!this.running && input.runningTime() - this.startTime >= this.timeout){
                        levelIndicatorLEDs.showColor(timeoutColor);
                        basic.pause(250)
                        levelIndicatorLEDs.clear();
                        basic.pause(250)
                    }
                }
            });
        }

        reset(): void {
            this.startTime = input.runningTime();
            if (this.running) return; 
            this.running = false;
            this.start();
        }

        stop(): void {
            this.running = false;
        }

        get_running(): boolean {
            return this.running;
        }
    }

    export const watchdog = new Watchdog(5*60*1000); /*Timeout after 5 minutes */

    function resetI2CDevices(){
        let reset_pin = DigitalPin.P1;
        pins.digitalWritePin(reset_pin, 1);
        basic.pause(50);
        pins.digitalWritePin(reset_pin, 0);
        basic.pause(250);
    }

    /**
     * Achtung! Dies setzt den eingebauten Timer ab und verhindert somit, dass die Elektromagnete von selbst abschalten.
     * Die Sicherheitsmassnahme bewirkt, dass nach 5 Minuten Dauerbetrieb das Spielfeld ausschaltet um vor Erhitzen zu schützen.
     */
    //% block="Sicherheits-Timeout ausschalten!"
    function sendHeartbeat() {
        console.log("Watchdog timer reset.");
        watchdog.reset();
    }

    /**
     * Schaltet alle Leistungen der Elektromagnete auf 0 (Abschalten der Elektromagnete).
     */
    //% block="Setze Leistung für alle Elektromagnete auf 0."
    export function zeroAllMagnets() {
        electromagnetDirection = [[0, 0], [0, 0], [0, 0], [0, 0]]
        electromagnetOutput = [[0, 0], [0, 0], [0, 0], [0, 0]]
    }

    /**
     * Dieser Block ermöglicht es, einzelne Elektromagnete anzusteuern (Index= 1 bis 8).
     * Zwischen 0 und 100 wird positiver Nord-Magnetismus erzeugt (rote LEDs).
     * Zwischen -100 und 0 werden negative Leistungen, also Süd-Magnetismus erzeugt (grüne LEDs).
     * Ein Alarmton wird ausgegeben, wenn kein Wert gesetzt ist. Nach 5 Minuten schalten die Magnete zum Schutz vor Überhitzung ab, LEDs leuchten farbig.
     * @param index des Elektromagnets
     * @param leistung die der Elektromagnet abgeben soll
     */
    //% block="Setze Leistung für Elektromagnet $index auf $leistung"
    //% leistung.min=-100 leistung.max=100
    //% index.min=1 index.max=8
    //% leistung.defl=100
    //% index.defl=1
    export function setMagnetPower(
        index?: number,
        leistung?: number) {

        if (firstRun){
            firstRun = false;
            watchdog.start();
        }

        if(!watchdog.get_running()){
            /* Prevent writing values to magnet coils if watchdog timer is lapsed */
            return;
        }
 
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
     * Setze die Leistung für alle Elektromagnete.
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
     * Sendet die aufgeführten Werte an das Magnetspielfeld.
     * Die Funktion soll bei Leistungswechseln oder am Ende des Programms ausgeführt werden, um die gesetzten Leistungen an das Spielfeld zu senden. 
     */
    //% block="Sende alle Leistungswerte zum Magnetspielfeld"
    export function writeAll() {
        let directionBuffer = pins.createBuffer(3)
        let speedBuffer = pins.createBuffer(3)

              
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
gamepad package
*/
//% weight=10 icon="\uf11b" color=#777777 block="nanomed 4life Controller" 
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
     * Führt die eingefügte Funktion aus, wenn der Knopf gedrückt wird. Der Controller verfügt über 4 Knöpfe. B1 (Gelb), B2 (Rot), Joystick Links, Joystick Rechts.
     * @param button the button that needs to be pressed
     * @param body code to run when event is raised
     */
    //% weight=86 blockId=onButtonPressed block="wenn Knopf |%button| gedrückt"
    export function onButtonPressed(button: Button, body: Action) {
        control.onEvent(EventBusSource.MES_DPAD_CONTROLLER_ID, button, body);
    }

    /**
     * Liest den Wert des gewünschten Joysticks in gewünschter Richtung. 
     * Die Werte liegen im Bereich -100 bis +100.
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
     * Der linke Joystick adressiert die Elektromagnete gemäss Richtung (Winkel) der Auslenkung.
     * Die Winkel werden dabei durch die 8 Teilkreise aufgeteilt.
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
     * Steuert die Auslenkung des Joysticks und reguliert damit die Magnetstärke.
     * Die einzugebenden Werte liegen im Bereich -100 bis +100. Pluswerte erzeugen Nord-Polarität (Rot)
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
* Magnetspielfeld und Advancer mit Joysticks steuern
*/
//% weight=10 icon="\uf11b" color=#333333 block="nanomed 4life Challenge" 
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
     * Funktion für den Baustein «Wenn Knopf ... gedrückt» 
     * Ändert die Ansteuerung einzelner Magnete zum Modus mit Gegenmagnet.
     * Der gegenüberliegende Magnet verstärkt damit das Magnetfeld, wenn dazu 
     * die «booster» im Spielfeld eingesetzt sind.
     * Dieser Modus ist speziell für die Challenge entwickelt.
     */
    //% weight=86 blockId=switchWippen block="Gegenmagnet ein-/ausschalten"
    export function switchWippen() {
        wippen = 1 - wippen
    }

    /**
     * Funktion für den Baustein «Wenn Knopf … gedrückt».
     * Dieser Modus aktiviert das Ein-und Ausschalten zusätzlicher benachbarter Elektromagnete, daher Taktbetrieb genannt. 
     * Siehe auch Block Taktbetrieb-Bereich, um die Navigation weiter zu optimieren.
     */
    //% weight=86 blockId=switchModus block="Navigation mit Taktbetrieb"
    export function switchModus() {
        modus = 1 - modus
    }

    /**
     * Funktion für den Baustein «Wenn Knopf … gedrückt»
     * Mit dieser Funktion wird der Winkel des Joysticks auf 3 oder 5 Magnete verteilt,
     * aber nur wenn "Navigation mit Taktbetrieb" eingeschaltet wurde.
     */
    //% weight=86 blockId=setMagnetabstand block="Taktbetrieb-Bereich"
    export function setMagnetabstand() {
        magnetabstand = magnetabstand === 1 ? 2 : 1
        // if (magnetabstand === 1) {
        //     magnetabstand = 2
        // } else {
        //     magnetabstand = 1
        // }
    }

     /**
     * Funktion für den Baustein «Wenn Knopf … gedrückt». 
     * Diese Funktion wechselt per Knopfdruck die Plus-/Minus-Polarität der Elektromagnete.
     */
    //% weight=86 blockId=switchPolarity block="wechsle Polarität der Elektromagnete"
    export function switchPolarity() {
        vorzeichen = -vorzeichen
    }

    /**
     * Dieser Baustein muss bei beiden micro:bits “beim Start” eingesetzt werden und dieselbe Nummer aufweisen.
     * Optional kann die Geschwindigkeit des Advancer Motors gesetzt werden.
     * @param frequency gewünschter Funkkanal
     */
    //% weight=86 blockId=setRadioGroup block="Funkkanal |%frequency|"
    export function setRadioGroup(frequency: number) {
        radioGroup = frequency
        radio.setGroup(radioGroup)
        basic.showNumber(radioGroup)
    }

    /**
     * Führt eine Aktion aus, wenn auf den gewünschten Knopf gedrückt wird.
     * @param button the button that needs to be pressed
     * @param body code to run when event is raised
     */
    //% weight=86 blockId=onButtonPressed block="wenn Knopf |%button| gedrückt"
    export function wrappedOnButtonPressed(button: handlebit.Button, body: Action) {
        control.onEvent(EventBusSource.MES_DPAD_CONTROLLER_ID, button, body)
    }

    /**
     * Funktion für den Baustein «Wenn Knopf … gedrückt».
     * Diese Funktion tauscht Joystick links und rechts.
     * Diese Funktion ist nicht mehr in der Liste, da sie kaum gebraucht wird.
     */
    //% weight=86 blockId=swapJS block="Joysticks R & L tauschen"
    function swapJS() {
        let temp = magnetJoystick
        magnetJoystick = advancerJoystick
        advancerJoystick = temp
    }

    /**
     * Der Advancer micro:bit (A) empfängt per Funk die vom Joystick Rechts gesendeten Werte, um den Advancer anzutreiben.
     * Diesem Block muss die Funktion hinzugefügt werden, welche für den Antrieb des Motors zuständig ist.
     * @param optionsOrCallback Optional configuration object or callback function
     * @param callbackOrUndefined Optional callback function
     */
    //% weight=86 blockId=receivingValues block="Empfängt Werte des Joystick Rechts:"
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
     * “Winkel” (Richtung / Magnetnummer) des linken Joysticks an 
     * das Magnetspielfeld via Kabel.
     * @param magnetJoystick
     */
    //% weight=86 blockId=setMagneticField block="Magnetspielfeld mit Joystick Links steuern"
    export function setMagneticField() {
        MagneticNavigation.watchdog.reset();
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
     * Die Werte der seitlichen Auslenkung des rechten Joysticks steuern den Advancermotor.
     * Der micro:bit (A- wie Advancer) empfängt diese Werte per Funk.
     * Dieser micro:bit (C wie Controller) weist die selbe Funknummer auf.
     */
    //% weight=86 blockId=sendAdvancerCommand block="Advancermotor mit Joystick Rechts ansteuern"
    export function sendAdvancerCommand() {
        let advancerSpeed = handlebit.getSensorValue(handlebit.Direction.DIR_X, advancerJoystick)
        if (advancerSpeed > 2 || advancerSpeed < -2) {
            radio.sendNumber(advancerSpeed)
        } else {
            radio.sendNumber(0)
        }
    }

    /**
     * Dieser Block treibt den Motor des Advancers per Funk an, wenn dieser dem Empfängerblock hinzugefügt wird.
     */
    //% weight=86 blockId=setAdvancerSpeed block="Antrieb des Advancermotors"
    export function setAdvancerSpeed() {
            motorPowerX = speedFactor*lastReceivedNumber
            if (motorPowerX != 0) {
                motor.MotorRun(motor.Motors.M1, motor.Dir.CW, motorPowerX)
            } else {
                motor.motorStop(motor.Motors.M1)
            }
    }

    /**
     * Dieser Block kann «beim Start» eingefügt werden.
     * Dieser Faktor (Wert zwischen 0.5 - 20 eintragen) steuert die Maximalgeschwindigkeit.
     * Default =1
     *  @param speed
     */
    //% weight=86 blockId=setAdvancerSpeedFactor block="Geschwindigkeit des Advancers |%speed|"
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
