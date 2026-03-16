import pytest
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import time

@pytest.fixture
def drivers():
    # Uruchomienie dwóch okien przeglądarki obok siebie dla wygody
    d1 = webdriver.Chrome()
    d2 = webdriver.Chrome()
    d1.set_window_size(800, 1000)
    d2.set_window_size(800, 1000)
    d1.set_window_position(0, 0)
    d2.set_window_position(801, 0)
    yield d1, d2
    d1.quit()
    d2.quit()

def test_konsensus_restart_dwoch_graczy(drivers):
    p1, p2 = drivers
    wait1 = WebDriverWait(p1, 20)
    wait2 = WebDriverWait(p2, 20)

    # --- ETAP 1: GRACZ 1 tworzy pokój ---
    p1.get("http://localhost:5173")
    input1 = wait1.until(EC.element_to_be_clickable((By.CSS_SELECTOR, "input[placeholder='root@cat']")))
    input1.send_keys("Host_Kot")
    p1.find_element(By.XPATH, "//button[contains(., 'Create New Lair')]").click()
    
    # Pobranie realnego ID pokoju z nagłówka
    room_id_elem = wait1.until(EC.presence_of_element_located((By.XPATH, "//*[contains(text(), 'ID:')]")))
    # Tekst wygląda jak "Room_ID: NEKO-XXXX" lub "ID: NEKO-XXXX"
    room_id = room_id_elem.text.split("ID:")[1].strip()
    print(f"Pokój utworzony pomyślnie: {room_id}")

    # --- ETAP 2: GRACZ 2 dołącza do pokoju ---
    p2.get("http://localhost:5173")
    input2 = wait2.until(EC.element_to_be_clickable((By.CSS_SELECTOR, "input[placeholder='root@cat']")))
    input2.send_keys("Gość_Kot")
    
    # KROK 1: Kliknięcie przycisku, aby pokazać pole do wpisania kodu
    p2.find_element(By.XPATH, "//button[contains(., 'Join Existing')]").click()
    
    # KROK 2: Wpisanie ID w pole z placeholderem 'NEKO-XXXX'
    join_input = wait2.until(EC.visibility_of_element_located((By.CSS_SELECTOR, "input[placeholder='NEKO-XXXX']")))
    join_input.send_keys(room_id)
    
    # KROK 3: Kliknięcie Authorize
    p2.find_element(By.XPATH, "//button[contains(., 'Authorize')]").click()

    # --- KRYTYCZNY ETAP: SYNCHRONIZACJA ---
    # Czekamy, aż OBAJ gracze zobaczą, że w pokoju są 2 osoby.
    # To gwarantuje, że serwer zaktualizował stan pokoju dla socketów.
    wait1.until(EC.text_to_be_present_in_element((By.TAG_NAME, "body"), "2 / 3"))
    wait2.until(EC.text_to_be_present_in_element((By.TAG_NAME, "body"), "2 / 3"))
    print("Gracze zsynchronizowani (2/3 online).")

    # --- ETAP 3: GŁOSOWANIE ---
    reboot_btn_xpath = "//button[contains(., 'Reboot')]"
    btn1 = wait1.until(EC.element_to_be_clickable((By.XPATH, reboot_btn_xpath)))
    btn2 = wait2.until(EC.element_to_be_clickable((By.XPATH, reboot_btn_xpath)))

    # Gracz 1 głosuje
    p1.execute_script("arguments[0].click();", btn1)
    print("Gracz 1 wysłał prośbę o restart.")

    # Sprawdzenie statusu u Gracza 2 (Broadcast Check)
    status_xpath = "//*[contains(., 'REBOOT_VOTES')]"
    
    try:
        # Czekamy na pojawienie się licznika głosów
        status_p2 = wait2.until(EC.visibility_of_element_located((By.XPATH, status_xpath)))
        print(f"Tekst statusu u Gracza 2: {status_p2.text}")
        
        # Weryfikacja logiki: 1 głos na 2 obecnych graczy
        assert "1" in status_p2.text and "2" in status_p2.text
        print("Potwierdzono: Gracz 2 otrzymał aktualizację 1/2.")

    except Exception:
        p2.save_screenshot("blad_synchronizacji.png")
        raise AssertionError("Gracz 2 nie zobaczył statusu głosowania 1/2. Sprawdź blad_synchronizacji.png")

    # Gracz 2 potwierdza (Konsensus)
    p2.execute_script("arguments[0].click();", btn2)
    print("Gracz 2 potwierdził. Oczekiwanie na overlay restartu...")

    # --- ETAP 4: WERYFIKACJA NAKŁADKI (OVERLAY) ---
    # Nakładka pojawia się po osiągnięciu 2/2 głosów
    overlay_xpath = "//*[contains(., 'SYSTEM_OVERRIDE') or contains(., 'DATA_REVEALED')]"
    overlay = wait1.until(EC.presence_of_element_located((By.XPATH, overlay_xpath)))
    print("Nakładka restartu pojawiła się. Test zakończony sukcesem!")