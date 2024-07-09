nanoMedForLife.wrappedOnButtonPressed(handlebit.Button.JOYSTICK1, function () {
    nanoMedForLife.switchWippen()
})
nanoMedForLife.wrappedOnButtonPressed(handlebit.Button.JOYSTICK2, function () {
    nanoMedForLife.switchModus()
})
nanoMedForLife.wrappedOnButtonPressed(handlebit.Button.B1, function () {
    nanoMedForLife.switchPolarity()
})
nanoMedForLife.wrappedOnButtonPressed(handlebit.Button.B2, function () {
    nanoMedForLife.setMagnetabstand()
})
nanoMedForLife.onReceivedNumberHandler(0, function (advancerSpeed) {
    nanoMedForLife.setAdvancerSpeed()
    basic.pause(40)
})
nanoMedForLife.init()
nanoMedForLife.setRadioGroup(10)
loops.everyInterval(100, function () {
    nanoMedForLife.setMagneticField()
    nanoMedForLife.sendAdvancerCommand()
})
