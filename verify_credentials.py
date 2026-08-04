import asyncio
from pathlib import Path
from playwright.async_api import async_playwright
import json
import os

SCREENSHOTS = Path("/tmp/browser/credentials_sprint/screenshots")
SCREENSHOTS.mkdir(parents=True, exist_ok=True)

async def main():
    async with async_playwright() as playwright:
        browser = await playwright.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1280, "height": 1800})
        
        # Injetar sessão se disponível
        storage_key = os.environ.get("LOVABLE_BROWSER_SUPABASE_STORAGE_KEY")
        session_json = os.environ.get("LOVABLE_BROWSER_SUPABASE_SESSION_JSON")
        
        page = await context.new_page()
        
        # Navegar para estabelecer origem
        await page.goto("http://localhost:8080")
        
        if storage_key and session_json:
            await page.evaluate(
                f"window.localStorage.setItem({json.dumps(storage_key)}, {json.dumps(session_json)})"
            )
        
        # Acessar a página de credenciais
        await page.goto("http://localhost:8080/os/admin/api/credentials", wait_until="networkidle")
        await page.screenshot(path=str(SCREENSHOTS / "1_listing.png"))
        print("Visualizada listagem de credenciais")
        
        # Abrir modal de nova credencial
        new_btn = page.get_by_role("button", name="Nova Credencial")
        if await new_btn.is_visible():
            await new_btn.click()
            await page.wait_for_timeout(500)
            await page.screenshot(path=str(SCREENSHOTS / "2_new_modal.png"))
            print("Visualizado modal de criação")
        else:
            print("Botão Nova Credencial não encontrado")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
