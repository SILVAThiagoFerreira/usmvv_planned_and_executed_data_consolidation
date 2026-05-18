from __future__ import annotations

import argparse
import tempfile
from pathlib import Path

from openpyxl import load_workbook
from playwright.sync_api import sync_playwright


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--base-url", required=True)
    parser.add_argument("--mvv", default=str(Path(__file__).resolve().parents[2] / "input" / "MVV.xlsx"))
    parser.add_argument("--rd", default=str(Path(__file__).resolve().parents[2] / "input" / "RD.txt"))
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    download_path = Path(tempfile.gettempdir()) / "browser-smoke.xlsx"
    if download_path.exists():
        download_path.unlink()

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(accept_downloads=True)
        page.goto(args.base_url, wait_until="domcontentloaded")
        page.wait_for_selector("#statusText")
        page.wait_for_function("document.documentElement.lang === 'pt-BR'")
        page.wait_for_function("document.querySelector('#languageSelect')?.value === 'pt'")
        page.wait_for_function("document.querySelector('#statusText')?.textContent?.includes('Anexe MVV.xlsx e RD.txt.')")
        page.wait_for_function("document.querySelector('#generateBtn')?.textContent === 'Gerar planilha'")

        page.locator("#languageSelect").select_option("en")
        page.wait_for_function("document.documentElement.lang === 'en'")
        page.wait_for_function("document.querySelector('#languageSelect')?.value === 'en'")
        page.wait_for_function("document.querySelector('#generateBtn')?.textContent === 'Generate workbook'")
        page.wait_for_function("document.querySelector('#statusText')?.textContent?.includes('Attach MVV.xlsx and RD.txt.')")

        page.locator("#languageSelect").select_option("zh")
        page.wait_for_function("document.documentElement.lang === 'zh-Hans'")
        page.wait_for_function("document.querySelector('#languageSelect')?.value === 'zh'")
        page.wait_for_function("document.querySelector('#generateBtn')?.textContent === '生成工作簿'")

        page.locator("#languageSelect").select_option("pt")
        page.wait_for_function("document.documentElement.lang === 'pt-BR'")
        page.wait_for_function("document.querySelector('#languageSelect')?.value === 'pt'")
        page.wait_for_function("document.querySelector('#generateBtn')?.textContent === 'Gerar planilha'")

        page.set_input_files("#mvvFile", args.mvv)
        page.set_input_files("#rdFile", args.rd)
        page.locator("#generateBtn").wait_for(state="visible")
        page.wait_for_function("!document.querySelector('#generateBtn')?.disabled")
        page.get_by_role("button", name="Gerar planilha").click()
        page.locator("#downloadLink").wait_for(state="visible")
        with page.expect_download() as download_info:
            page.get_by_role("link", name="Baixar MVV_RD_CONSOLIDADO_FINAL.xlsx").click()
        download = download_info.value
        download.save_as(str(download_path))
        browser.close()

    wb = load_workbook(download_path, data_only=True)
    assert wb.sheetnames == ["CONSOLIDADO_FINAL", "RD_TRATADA", "LOG_VALIDACAO"]
    download_path.unlink(missing_ok=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
