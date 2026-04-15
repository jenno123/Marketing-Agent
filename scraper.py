"""
Scraper til alle tre museer.
Kør lokalt: python scraper.py
Genererer tre filer i data/:
  - hjerlhede_knowledge.txt
  - holstebro_knowledge.txt
  - strandingsmuseum_knowledge.txt
"""

import requests
from bs4 import BeautifulSoup
import os
import time

MUSEUMS = {
    "hjerlhede": {
        "file": "data/hjerlhede_knowledge.txt",
        "urls": [
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
    },
    "holstebro": {
        "file": "data/holstebro_knowledge.txt",
        "urls": [
            "https://holstebro-museum.dk/",
            "https://holstebro-museum.dk/oplevelser/",
            "https://holstebro-museum.dk/priser-og-aabningstider/",
            "https://holstebro-museum.dk/foer-dit-besoeg/",
            "https://holstebro-museum.dk/skoler-og-grupper/",
            "https://holstebro-museum.dk/undervisningsforloeb/",
            "https://holstebro-museum.dk/cafe-museum/",
            "https://holstebro-museum.dk/kontakt-os/",
            "https://holstebro-museum.dk/holstebro-museumsforening/",
            "https://da.wikipedia.org/wiki/Holstebro_Museum",
        ]
    },
    "strandingsmuseum": {
        "file": "data/strandingsmuseum_knowledge.txt",
        "urls": [
            "https://strandingsmuseet.dk/",
            "https://strandingsmuseet.dk/oplevelser/",
            "https://strandingsmuseet.dk/priser-og-aabningstider/",
            "https://strandingsmuseet.dk/skoler-og-grupper/",
            "https://strandingsmuseet.dk/tilgaengelighed/",
            "https://strandingsmuseet.dk/historien/",
            "https://strandingsmuseet.dk/om-museet/",
            "https://strandingsmuseet.dk/kontakt-os/",
            "https://strandingsmuseet.dk/stoetteforeningen/",
            "https://da.wikipedia.org/wiki/Strandingsmuseum_St._George",
        ]
    }
}


def scrape_page(url):
    """Henter og renser tekst fra en URL."""
    try:
        headers = {"User-Agent": "Mozilla/5.0 (compatible; MuseumScraper/1.0)"}
        response = requests.get(url, headers=headers, timeout=15)
        response.raise_for_status()
        soup = BeautifulSoup(response.text, "html.parser")

        # Fjern scripts, styles, nav, footer
        for tag in soup(["script", "style", "nav", "footer", "header", "aside"]):
            tag.decompose()

        text = soup.get_text(separator="\n", strip=True)

        # Rens tomme linjer
        lines = [line.strip() for line in text.splitlines() if line.strip()]
        return "\n".join(lines)
    except Exception as e:
        print(f"  Fejl ved {url}: {e}")
        return ""


def scrape_museum(name, config):
    """Scraper alle sider for ét museum og gemmer i én fil."""
    print(f"\n{'='*50}")
    print(f"Scraper: {name}")
    print(f"{'='*50}")

    all_text = []
    for url in config["urls"]:
        print(f"  Henter: {url}")
        text = scrape_page(url)
        if text:
            all_text.append(f"--- KILDE: {url} ---\n{text}")
        time.sleep(1)  # Vær venlig mod serverne

    output = "\n\n".join(all_text)

    os.makedirs("data", exist_ok=True)
    with open(config["file"], "w", encoding="utf-8") as f:
        f.write(output)

    print(f"  Gemt: {config['file']} ({len(output)} tegn)")


if __name__ == "__main__":
    import sys

    # Kør enten et specifikt museum eller alle
    if len(sys.argv) > 1:
        museum = sys.argv[1]
        if museum in MUSEUMS:
            scrape_museum(museum, MUSEUMS[museum])
        else:
            print(f"Ukendt museum: {museum}")
            print(f"Muligheder: {', '.join(MUSEUMS.keys())}")
    else:
        for name, config in MUSEUMS.items():
            scrape_museum(name, config)

    print("\nFærdig!")
