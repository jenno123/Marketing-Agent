import requests
from bs4 import BeautifulSoup
import time
import os
import json

OUTPUT_FILE = "data/hjerlhede_knowledge.txt"
SIDER_FILE = "data/sider.json"

DEFAULT_SIDER = [
    "https://www.hjerlhede.dk",
    "https://www.hjerlhede.dk/om-hjerlhede",
    "https://www.hjerlhede.dk/besog",
    "https://www.hjerlhede.dk/aktiviteter",
    "https://www.hjerlhede.dk/historien",
    "https://www.hjerlhede.dk/billetter",
    "https://www.hjerlhede.dk/skoler",
    "https://www.hjerlhede.dk/grupper",
    "https://www.hjerlhede.dk/kontakt",
    "https://hjerlhede.dk/oplevelse/historiske-huse-og-bygninger/",
    "https://hjerlhede.dk/oplevelse/vip-tur-med-hestevogn-ud-over-heden/",
    "https://hjerlhede.dk/oplevelse/det-legende-menneske-gennem-tiden/",
    "https://hjerlhede.dk/oplevelse/vi-aabner-for-saesonen-1-maj-2026/",
    "https://da.wikipedia.org/wiki/Frilandsmuseet_Hjerl_Hede",
]


def load_sider():
    try:
        with open(SIDER_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return DEFAULT_SIDER


def scrape_page(url):
    try:
        headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
        r = requests.get(url, timeout=10, headers=headers)
        if r.status_code != 200:
            print(f"  Sprang over (status {r.status_code}): {url}")
            return ""
        soup = BeautifulSoup(r.text, "html.parser")
        for tag in soup(["script", "style", "nav", "footer", "header"]):
            tag.decompose()
        text = soup.get_text(separator="\n", strip=True)
        lines = [l for l in text.splitlines() if len(l) > 30]
        return "\n".join(lines)
    except Exception as e:
        print(f"  Fejl på {url}: {e}")
        return ""


def run_scraper():
    sider = load_sider()
    print(f"Starter scraping af {len(sider)} sider...\n")
    al_tekst = []

    for url in sider:
        print(f"  Scraper: {url}")
        tekst = scrape_page(url)
        if tekst:
            al_tekst.append(f"=== {url} ===\n{tekst}\n")
            print(f"  OK ({len(tekst)} tegn)")
        else:
            print(f"  Ingen tekst fundet")
        time.sleep(0.5)

    os.makedirs("data", exist_ok=True)
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        f.write("\n".join(al_tekst))

    print(f"\nFærdig! Gemt i {OUTPUT_FILE}")
    print(f"Størrelse: {os.path.getsize(OUTPUT_FILE) // 1024} KB")


if __name__ == "__main__":
    run_scraper()