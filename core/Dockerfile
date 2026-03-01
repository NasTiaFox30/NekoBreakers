FROM python:3.9

WORKDIR /code

# Встановлюємо залежності
COPY ./requirements.txt /code/requirements.txt
RUN pip install --no-cache-dir --upgrade -r /code/requirements.txt

# Копіюємо код
COPY . .

# Відкриваємо порт 7860
EXPOSE 7860

# Запускаємо сервер
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7860"]