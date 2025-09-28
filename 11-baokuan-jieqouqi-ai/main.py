from fastapi import FastAPI

app = FastAPI()

@app.get("/")
def read_root():
    print("Hello World")
    print("test commitlint")
    print("test bad commitlint")
    return {"Hello": "Vibe Coding System - AI Service- baokuan-jieqouqi-ai"}