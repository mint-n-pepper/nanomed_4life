def my_function():
    nanoMedForLife.switch_wippen()
nanoMedForLife.wrapped_on_button_pressed(handlebit.Button.JOYSTICK1, my_function)

def my_function2():
    nanoMedForLife.switch_modus()
nanoMedForLife.wrapped_on_button_pressed(handlebit.Button.JOYSTICK2, my_function2)

def my_function3():
    nanoMedForLife.switch_polarity()
nanoMedForLife.wrapped_on_button_pressed(handlebit.Button.B1, my_function3)

def on_received_number_handler(advancerSpeed):
    nanoMedForLife.set_advancer_speed()
    basic.pause(40)
nanoMedForLife.on_received_number_handler(0, on_received_number_handler)

def my_function4():
    nanoMedForLife.set_magnetabstand()
nanoMedForLife.wrapped_on_button_pressed(handlebit.Button.B2, my_function4)

nanoMedForLife.init()
nanoMedForLife.set_radio_group(10)

def on_every_interval():
    nanoMedForLife.set_magnetic_field()
    nanoMedForLife.send_advancer_command()
loops.every_interval(100, on_every_interval)
