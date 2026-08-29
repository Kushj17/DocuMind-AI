import os
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv("c:/Users/kushj/OneDrive/Desktop/Coding/Projects/rag/backend/.env")
genai.configure(api_key=os.environ["GOOGLE_API_KEY"])

print("Available models:")
for m in genai.list_models():
    if "embedContent" in m.supported_generation_methods:
        print(f"Name: {m.name}")
