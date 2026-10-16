# Ответы к задачам главы "Функции"

# Задача 1. Простая функция
# Напишите функцию `say_hello()`, которая печатает "Привет!". Вызовите её.
def say_hello():
    print("Привет!")

say_hello()

# Задача 2. Приветствие по имени
# Функция `greet(name)`, печатает "Привет, <name>!".
def greet(name):
    print(f"Привет, {name}!")

greet("Пилот")

# Задача 3. Сложение
# Функция `add(a, b)`, возвращает сумму двух чисел.
def add(a, b):
    return a + b

print(add(5, 3))

# Задача 4. Квадрат числа
# Функция `square(x)`, возвращает x в квадрате.
def square(x):
    return x * x

print(square(4))

# Задача 5. Максимум
# Функция `my_max(a, b)`, возвращает большее из двух.
def my_max(a, b):
    if a > b:
        return a
    return b

print(my_max(10, 5))

# Задача 6. Четное ли?
# Функция `is_even(n)`, возвращает True, если число четное.
def is_even(n):
    return n % 2 == 0

print(is_even(4))

# Задача 7. Периметр прямоугольника
# Функция `perimeter(a, b)`, возвращает 2 * (a + b).
def perimeter(a, b):
    return 2 * (a + b)

print(perimeter(3, 4))

# Задача 8. Перевод метров в сантиметры
# Функция `m_to_cm(meters)`, возвращает сантиметры.
def m_to_cm(meters):
    return meters * 100

print(m_to_cm(1.5))

# Задача 9. Статус батареи
# Функция `check_battery(voltage)`. Если < 3.5 -> "Low", иначе "OK".
def check_battery(voltage):
    if voltage < 3.5:
        return "Low"
    return "OK"

print(check_battery(3.4))

# Задача 10. Модуль числа
# Функция `my_abs(x)`. Если x < 0, возвращает -x, иначе x.
def my_abs(x):
    if x < 0:
        return -x
    return x

print(my_abs(-5))

# Задача 11. Среднее
# Функция `avg(a, b)`. Возвращает среднее арифметическое.
def avg(a, b):
    return (a + b) / 2

print(avg(10, 20))

# Задача 12. Функция без return
# Функция `log_error(msg)`, печатает "ERROR: <msg>".
def log_error(msg):
    print(f"ERROR: {msg}")

log_error("Connection lost")

# Задача 13. Умножение строк
# Функция `repeat(s, n)`, возвращает строку s, повторенную n раз.
def repeat(s, n):
    return s * n

print(repeat("Go", 3))

# Задача 14. Полетное время
# Функция `flight_time(battery_capacity, consumption)`. t = cap / cons.
def flight_time(cap, cons):
    return cap / cons

print(flight_time(1000, 100)) # 10 минут

# Задача 15. Полное имя
# Функция `full_name(first, last)`, возвращает "Фамилия Имя".
def full_name(first, last):
    return f"{last} {first}"

print(full_name("Ivan", "Petrov"))
