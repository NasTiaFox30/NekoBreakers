import pytest
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import time

@pytest.fixture
def driver():
    options = webdriver.ChromeOptions()
    driver = webdriver.Chrome(options=options)
    driver.set_window_size(1400, 900) 
    yield driver
    driver.quit()

def wejdz_do_gry(driver, wait, name="Tester_Kot"):
    """Funkcja pomocnicza do szybkiego logowania"""
    driver.get("http://localhost:5173")
    alias_input = wait.until(EC.visibility_of_element_located((By.CSS_SELECTOR, "input[placeholder='root@cat']")))
    alias_input.send_keys(name)
    create_btn = driver.find_element(By.XPATH, "//button[contains(text(), 'Create New Lair')]")
    create_btn.click()
    wait.until(EC.presence_of_element_located((By.XPATH, "//*[contains(text(), 'ID:')]")))

def wyslij_slowo(driver, wait, word):
    """Funkcja pomocnicza do stabilnego wpisywania słowa"""
    game_input = wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, "input[placeholder*='TYPE']")))
    driver.execute_script("arguments[0].click();", game_input)
    game_input.clear()
    for char in word:
        game_input.send_keys(char)
        time.sleep(0.02)
    game_input.send_keys(Keys.ENTER)

# --- TEST CZARNEGO ARCHIWUM (System Trash) ---
def test_odrzucenie_nieistniejacego_slowa(driver):
    wait = WebDriverWait(driver, 15)
    wejdz_do_gry(driver, wait)

    # Używamy unikalnego słowa, którego nie ma w słowniku
    slowo_nieistniejace = "ERR_KOD_999"
    wyslij_slowo(driver, wait, slowo_nieistniejace)

    # Ulepszony lokator: szukamy elementu zawierającego słowo ORAZ tekst REJECTED
    # Wykorzystujemy 'presence', ponieważ animacja Framer Motion może być bardzo szybka
    rejected_locator = (By.XPATH, f"//*[contains(., '{slowo_nieistniejace}') and contains(., 'REJECTED')]")
    
    try:
        # Czekamy na pojawienie się komunikatu (widoczny przez 3 sekundy w kodzie React)
        element = wait.until(EC.presence_of_element_located(rejected_locator))
        print(f"Sukces: System poprawnie wyświetlił odrzucenie słowa '{slowo_nieistniejace}'.")
        
        # DODATKOWA WERYFIKACJA: Czy słowo trafiło do System_Trash (Archiwum)
        # Czekamy 3.5 sekundy (czas setTimeout w React + bufor)
        time.sleep(3.5) 
        
        archiwum_item = driver.find_element(By.XPATH, f"//*[contains(text(), '{slowo_nieistniejace}')]")
        print("Potwierdzono: Słowo zostało przeniesione do archiwum System_Trash.")
        
    except Exception:
        driver.save_screenshot("blad_archiwum_v1.3.png")
        # Pobieramy tekst strony do diagnostyki
        caly_tekst = driver.find_element(By.TAG_NAME, "body").text
        print(f"DEBUG: Czy słowo jest na ekranie: {slowo_nieistniejace in caly_tekst}")
        raise AssertionError(f"Test nie wykrył animacji REJECTED dla słowa {slowo_nieistniejace}")

# --- TEST LOGIKI EKRANU ZWYCIĘSTWA (Victory Reveal) ---
def test_logika_formularza_po_wyslaniu(driver):
    wait = WebDriverWait(driver, 15)
    wejdz_do_gry(driver, wait)

    # Test sprawdzający, czy formularz czyści się poprawnie (oznaka działania handleSubmit)
    game_input = driver.find_element(By.CSS_SELECTOR, "input[placeholder*='TYPE']")
    wyslij_slowo(driver, wait, "TEST_CHECK")
    
    time.sleep(1)
    current_value = game_input.get_attribute("value")
    assert current_value == "", f"Input nie został wyczyszczony, zawiera: {current_value}"
    print("Sukces: Logika formularza działa, pole jest gotowe na kolejne próby.")