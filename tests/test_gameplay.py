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
    # Rozmiar okna jest ważny, aby uniknąć przypadkowego włączenia trybu mobilnego
    driver = webdriver.Chrome(options=options)
    driver.set_window_size(1400, 900) 
    yield driver
    driver.quit()

# --- TEST PEŁNEGO PRZEPŁYWU GRY (End-to-End) ---
def test_pelny_przeplyw_gry(driver):
    wait = WebDriverWait(driver, 15)
    driver.get("http://localhost:5173")
    driver.set_window_size(1400, 900) # Ustawienie rozmiaru dla Desktopu

    # 1. ETAP: LOBBY
    # Znalezienie pola Alias za pomocą placeholderu
    alias_input = wait.until(EC.visibility_of_element_located((By.CSS_SELECTOR, "input[placeholder='root@cat']")))
    alias_input.send_keys("Tester_Kot")

    # Kliknięcie przycisku tworzenia nowej sesji
    create_btn = driver.find_element(By.XPATH, "//button[contains(text(), 'Create New Lair')]")
    create_btn.click()

    # 2. ETAP: PRZEJŚCIE DO GRY
    # Oczekiwanie, aż lobby zniknie i pojawi się interfejs gry
    wait.until(EC.presence_of_element_located((By.XPATH, "//*[contains(text(), 'ID:')]")))
    print("Autoryzacja zakończona sukcesem, wejście do systemu.")

    # 3. ETAP: WPROWADZANIE SŁOWA
    # Szukanie inputu za pomocą częściowego dopasowania placeholderu
    game_input = wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, "input[placeholder*='TYPE']")))
    
    # KLUCZOWY MOMENT: Kliknięcie w input za pomocą JS, aby upewnić się, że jest aktywny
    driver.execute_script("arguments[0].click();", game_input)
    
    slowo_testowe = "БЕЗПЕКА"
    
    # Symulacja wpisywania znak po znaku z opóźnieniem (naśmadowanie człowieka)
    game_input.clear()
    for char in slowo_testowe:
        game_input.send_keys(char)
        time.sleep(0.05) 
    
    # Wysłanie słowa klawiszem ENTER
    game_input.send_keys(Keys.ENTER)
    print(f"Słowo '{slowo_testowe}' zostało wysłane przez Keys.ENTER")

    # 4. ETAP: WERYFIKACJA WYNIKU
    # Szukamy słowa w strumieniu danych (Processing Stream)
    # Używamy translate(), aby ignorować wielkość liter w XPath
    word_xpath = f"//span[contains(translate(text(), 'abcdefghijklmnopqrstuvwxyz', 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'), '{slowo_testowe}')]"
    
    try:
        # Czekamy dłużej na odpowiedź z Brain Core (FastAPI)
        long_wait = WebDriverWait(driver, 20)
        word_element = long_wait.until(EC.visibility_of_element_located((By.XPATH, word_xpath)))
        print(f"POTWIERDZONO: Słowo '{slowo_testowe}' pojawiło się w terminalu.")
    except Exception:
        driver.save_screenshot("blad_wejscia.png")
        current_val = game_input.get_attribute("value")
        print(f"DEBUG: Wartość w inpucie w momencie błędu: '{current_val}'")
        raise AssertionError(f"Słowo nie pojawiło się. Możliwe, że input był pusty: '{current_val}'")

# --- TEST LOGIKI PRZEPŁYWU DOŁĄCZANIA I ANULOWANIA (Lobby Navigation) ---
def test_przeplyw_dolaczania_i_anulowania(driver):
    """Test logiki przełączania przycisków w lobby"""
    wait = WebDriverWait(driver, 10)
    driver.get("http://localhost:5173")

    # Kliknięcie Dołącz (Join)
    join_btn = wait.until(EC.element_to_be_clickable((By.XPATH, "//button[contains(text(), 'Join Existing')]")))
    join_btn.click()

    # Sprawdzenie pojawienia się pola na kod pokoju
    room_input = wait.until(EC.visibility_of_element_located((By.CSS_SELECTOR, "input[placeholder='NEKO-XXXX']")))
    assert room_input.is_displayed()

    # Kliknięcie Powrót (Back)
    back_btn = driver.find_element(By.XPATH, "//button[contains(text(), 'Back')]")
    back_btn.click()

    # Sprawdzenie, czy przycisk Utwórz (Create) jest ponownie widoczny
    assert driver.find_element(By.XPATH, "//button[contains(text(), 'Create New Lair')]").is_displayed()
    print("Nawigacja w lobby działa poprawnie.") 