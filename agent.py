import anthropic
from dotenv import load_dotenv

load_dotenv()

KNOWLEDGE_FILE = "data/hjerlhede_knowledge.txt"

def load_knowledge():
    with open(KNOWLEDGE_FILE, "r", encoding="utf-8") as f:
        return f.read()

def build_system_prompt(knowledge):
    return f"""
Du er social media manager for Hjerlhede Frilandsmuseum i Midtjylland.
Du skriver opslag der er varme, autentiske og historiefortællende — aldrig corporate eller klichéfyldte.
Undgå fraser som "unik oplevelse", "noget for hele familien" og "kom og oplev".

VIDEN OM HJERLHEDE (hentet direkte fra hjerlhede.dk):
{knowledge}

PLATFORMSREGLER:
- Facebook: 150-250 ord. Fortællende, personligt, slut med et spørgsmål eller opfordring.
- Instagram: Max 120 ord + 6-8 hashtags. Billedtekst der sætter scenen.
- LinkedIn: 150-200 ord. Fokus på kulturarv, formidling og fællesskab. Professionel tone.

Brug altid konkrete detaljer fra vidensbasen. Opfind ikke information.
Svar KUN med selve opslaget — ingen forklaringer eller kommentarer.
"""

def generer_opslag(platform, briefing):
    knowledge = load_knowledge()
    system = build_system_prompt(knowledge)

    client = anthropic.Anthropic()
    response = client.messages.create(
        model="claude-opus-4-5",
        max_tokens=1000,
        system=system,
        messages=[{
            "role": "user",
            "content": f"Skriv et {platform}-opslag om: {briefing}"
        }]
    )
    return response.content[0].text

if __name__ == "__main__":
    print("=== Hjerlhede Marketing Agent ===\n")

    platform = input("Platform (Facebook / Instagram / LinkedIn): ").strip()
    briefing = input("Hvad skal opslaget handle om? ").strip()

    print("\nGenererer opslag...\n")
    opslag = generer_opslag(platform, briefing)
    print("=" * 50)
    print(opslag)
    print("=" * 50)