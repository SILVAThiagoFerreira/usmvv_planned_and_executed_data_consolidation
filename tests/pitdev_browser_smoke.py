from __future__ import annotations

import argparse
import tempfile
from pathlib import Path

from openpyxl import load_workbook
from playwright.sync_api import sync_playwright


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--base-url", required=True)
    parser.add_argument("--field", required=True)
    parser.add_argument("--plan", required=True)
    args = parser.parse_args()
    download_path = Path(tempfile.gettempdir()) / "pitdev-browser-smoke.xlsx"
    field_only_download_path = Path(tempfile.gettempdir()) / "pitdev-browser-field-only.xlsx"
    screenshot_path = Path(tempfile.gettempdir()) / "pitdev-browser-smoke.png"
    download_path.unlink(missing_ok=True)
    field_only_download_path.unlink(missing_ok=True)
    screenshot_path.unlink(missing_ok=True)
    field_rows = [
        [value.strip() for value in line.split(",")]
        for line in Path(args.field).read_text(encoding="utf-8").splitlines()
        if line.strip()
    ]

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        page = browser.new_page(accept_downloads=True, viewport={"width": 1440, "height": 1100})
        page.set_default_timeout(120000)
        page.goto(args.base_url, wait_until="domcontentloaded")
        page.on("console", lambda message: print(f"browser console: {message.type}: {message.text}"))
        page.wait_for_selector("#pitdevTitle")
        page.wait_for_function("document.querySelector('#pitdevTitle')?.textContent === 'Consolidação O-PitDev'")
        page.wait_for_function("document.querySelector('#pitdevGenerateBtn')?.disabled === true")
        page.wait_for_function("document.querySelector('.pitdev-panel')?.open === false")
        page.locator(".pitdev-summary").click()
        page.set_input_files("#pitdevFieldFile", args.field)
        page.wait_for_function("document.querySelector('#pitdevFieldOnlyBtn')?.disabled === false")
        page.wait_for_function("document.querySelector('#pitdevGenerateBtn')?.disabled === true")
        page.get_by_role("button", name="Organizar somente o levantado").click()
        page.wait_for_function("document.querySelector('#pitdevStatusText')?.textContent?.includes('Levantamento organizado.')")
        page.locator("#pitdevDownloadLink").wait_for(state="visible")
        with page.expect_download() as field_only_download_info:
            page.get_by_role("link", name="Baixar LEVANTAMENTO_O-PITDEV_ORGANIZADO.xlsx").click()
        field_only_download_info.value.save_as(str(field_only_download_path))

        page.set_input_files("#pitdevPlanFile", args.plan)
        page.wait_for_function("!document.querySelector('#pitdevGenerateBtn')?.disabled")
        page.wait_for_function("document.querySelector('#pitdevStatusText')?.textContent?.includes('Pronto para consolidar')")
        page.get_by_role("button", name="Consolidar O-PitDev").click()
        page.wait_for_timeout(2000)
        if page.locator("#pitdevOptions").is_visible():
            page.locator("#pitdevToeElevationInput").fill("290")
            page.locator("#pitdevSubdrillingValueInput").fill("1")
            page.get_by_role("button", name="Calcular e consolidar").click()
        print("pitdev status:", page.locator("#pitdevStatusText").text_content())
        print("pitdev log:", page.locator("#pitdevLogOutput").text_content())
        page.wait_for_function("document.querySelector('#pitdevStatusText')?.textContent?.includes('Consolidação gerada.')")
        page.wait_for_function(
            "expected => document.querySelector('#pitdevSummaryCards')?.textContent?.includes(String(expected))",
            arg=len(field_rows),
        )
        page.locator("#pitdevDownloadLink").wait_for(state="visible")
        page.screenshot(path=str(screenshot_path), full_page=True)
        with page.expect_download() as download_info:
            page.get_by_role("link", name="Baixar CONSOLIDACAO_PROJETO_O-PITDEV.xlsx").click()
        download_info.value.save_as(str(download_path))
        browser.close()

    workbook = load_workbook(download_path, data_only=True)
    assert workbook.sheetnames == ["CONSOLIDACAO_O-PITDEV", "LOG_O-PITDEV"]
    sheet = workbook["CONSOLIDACAO_O-PITDEV"]
    assert [cell.value for cell in sheet[1]] == [
        "ID", "Y", "X", "Z", "Diâmetro", "Azimute", "Ângulo planejado", "Ângulo do talude", "Profundidade"
    ]
    assert sheet.max_row == len(field_rows) + 1
    expected_first_id = field_rows[0][0]
    try:
        expected_first_id = str(int(float(expected_first_id)))
    except ValueError:
        pass
    assert str(sheet[2][0].value) == expected_first_id
    assert round(sheet[2][1].value, 3) == round(float(field_rows[0][1]), 3)
    assert round(sheet[2][2].value, 3) == round(float(field_rows[0][2]), 3)
    assert round(sheet[2][3].value, 3) == round(float(field_rows[0][3]), 3)
    assert all(sheet[2][column].value is not None for column in [4, 5, 6, 7, 8])
    headers = [cell.value for cell in sheet[1]]
    depth_index = headers.index("Profundidade") + 1
    auxiliary_depths = [sheet.cell(row, depth_index).value for row in range(2, sheet.max_row + 1) if sheet.cell(row, 5).value is None]
    if auxiliary_depths:
        assert all(value is not None for value in auxiliary_depths)
        field_z_by_id = {
            str(int(float(row[0]))): float(row[3])
            for row in field_rows
            if row[0].strip()
        }
        for row_number in range(2, sheet.max_row + 1):
            if sheet.cell(row_number, 5).value is None:
                hole_id = str(sheet.cell(row_number, 1).value)
                expected_depth = field_z_by_id[hole_id] - 290 + 1
                assert round(sheet.cell(row_number, depth_index).value, 3) == round(expected_depth, 3)
    field_only_workbook = load_workbook(field_only_download_path, data_only=True)
    assert field_only_workbook.sheetnames == ["LEVANTAMENTO_O-PITDEV", "LOG_LEVANTAMENTO_O-PITDEV"]
    field_only_sheet = field_only_workbook["LEVANTAMENTO_O-PITDEV"]
    assert [cell.value for cell in field_only_sheet[1]] == ["ID", "Y", "X", "Z"]
    assert field_only_sheet.max_row == len(field_rows) + 1
    assert field_only_sheet[2][0].value == int(float(field_rows[0][0]))
    assert field_only_sheet[field_only_sheet.max_row][0].value == int(float(field_rows[-1][0]))
    print(f"ok - O-PitDev browser flow | rows={sheet.max_row - 1} | screenshot={screenshot_path}")
    download_path.unlink(missing_ok=True)
    field_only_download_path.unlink(missing_ok=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
