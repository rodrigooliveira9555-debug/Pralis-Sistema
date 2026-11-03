"""Browser regression checks for fixed navigation and the quick menu.

Serve the repository with `python -m http.server 8000`, then run:
    python tests/footer-toolbar.py
Requires Playwright and Chromium. Uses an isolated browser; no real data is saved.
"""
import argparse
import shutil
from playwright.sync_api import sync_playwright


def open_operations(page):
    page.evaluate("""() => {
        if (document.body.classList.contains('mobile-menu-visible'))
            document.getElementById('toggleMenu').click();
        openSection(sections[6][0], 'Diretor de Operação', 'settings', '#7c3aed');
    }""")
    page.wait_for_timeout(150)


def footer(page):
    return page.locator('.view.show .people-bottom-header')


def check_layout(browser, url):
    checked = 0
    for width in [320, 390, 1024]:
        page = browser.new_page(viewport={'width': width, 'height': 844})
        page.set_default_timeout(8000)
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.route('https://fonts.googleapis.com/**', lambda route: route.abort())
        page.goto(url, wait_until='domcontentloaded')
        open_operations(page)
        page.evaluate('showJobProfiles()')
        views = page.locator('.view').evaluate_all('es => es.map(e => e.id)')
        for dark in [False, True]:
            page.evaluate('(dark) => document.body.classList.toggle("dark-theme", dark)', dark)
            page.wait_for_timeout(200)
            for view_id in views:
                page.evaluate('(id) => document.querySelectorAll(".view").forEach(v => v.classList.toggle("show", v.id === id))', view_id)
                page.wait_for_timeout(90)
                bar = footer(page)
                rect = bar.bounding_box()
                assert rect['x'] == 0 and rect['width'] == width, (width, dark, view_id, rect)
                assert abs(rect['y'] + rect['height'] - 844) < .1
                logo = bar.locator('.people-home-logo').bounding_box()
                assert abs(logo['x'] + logo['width'] / 2 - width / 2) < .1
                for side, count in [('.people-footer-left', 4), ('.people-footer-right', 5)]:
                    buttons = bar.locator(side + '>button')
                    assert buttons.count() == count
                    boxes = []
                    for button in buttons.all():
                        assert button.is_visible(), (view_id, button.get_attribute('aria-label'))
                        box = button.bounding_box()
                        assert box['x'] >= 0 and box['x'] + box['width'] <= width + .1
                        boxes.append(box)
                    assert all(a['x'] + a['width'] <= b['x'] + .1 for a, b in zip(boxes, boxes[1:]))
                assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
                bar.locator('.people-home-logo').click()
                assert bar.locator('.people-bottom-tools').is_visible()
                assert bar.bounding_box()['height'] > rect['height']
                assert bar.locator('.people-home-logo').bounding_box()['width'] == 32
                page.mouse.click(width / 2, 20)
                assert bar.locator('.people-bottom-tools').is_hidden()
                bar.locator('.people-toolbar-more').click()
                choices = bar.locator('.people-toolbar-options')
                assert choices.is_visible()
                assert choices.locator('[data-choice-key="search"], [data-choice-key="sort"], [data-choice-key="date"], [data-choice-key="save"]').count() == 0
                choices.locator('.people-options-resize').click()
                assert choices.locator('.people-options-resize').get_attribute('aria-expanded') == 'true'
                page.mouse.click(width / 2, 20)
                assert choices.is_hidden()
                checked += 1
            print('PASS layout', width, 'dark=', dark, flush=True)
        assert not errors, errors
        page.close()
    return checked


def check_actions(browser, url):
    page = browser.new_page(viewport={'width': 390, 'height': 844})
    page.set_default_timeout(8000)
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.on('dialog', lambda dialog: dialog.accept())
    page.route('https://fonts.googleapis.com/**', lambda route: route.abort())
    page.goto(url, wait_until='domcontentloaded')
    open_operations(page)
    bar = footer(page)
    row_order = lambda: page.locator('#sector-content .record-grid>.record').evaluate_all('es => es.map(e => e.dataset.target)')
    original = row_order()
    sort = bar.locator('.sort-az')
    sort.click()
    ascending = row_order()
    assert ascending != original and sort.get_attribute('aria-label') == 'Organizar de Z a A'
    sort.click()
    assert row_order() == list(reversed(ascending))
    assert sort.get_attribute('aria-label') == 'Restaurar ordem original'
    sort.click()
    assert row_order() == original and sort.get_attribute('aria-label') == 'Organizar de A a Z'
    date = bar.locator('.people-date-control')
    assert date.get_attribute('aria-disabled') == 'true'
    date.click(force=True)
    assert bar.locator('.people-date-panel').is_hidden()
    bar.locator('.people-search-toggle').click()
    search = bar.locator('.people-bottom-search input:visible')
    search.fill('mercadorias')
    assert page.locator('#sector-content .record:not([hidden])').count() == 1
    search.press('Escape')
    assert page.locator('#sector-content .record:not([hidden])').count() == len(original)
    bar.locator('.people-toolbar-more').click()
    choices = bar.locator('.people-toolbar-options')
    assert choices.locator('[data-choice-key="sold"]').count() == 0
    choices.locator('.people-options-resize').click()
    choices.locator('[data-choice-key="print"] .people-toolbar-visibility').click()
    choices.locator('[data-choice-key="export"] .people-toolbar-hidden-toggle').click()
    choices.locator('[data-choice-key="sold"] .people-order-handle').press('ArrowDown')
    choices.locator('.people-options-resize').click()
    assert choices.locator('[data-choice-key="print"], [data-choice-key="export"]').count() == 0
    bar.locator('.people-toolbar-more').click()
    bar.locator('.people-home-logo').click()
    assert bar.locator('.people-bottom-tools [data-control-key="print"]').is_visible()
    assert bar.locator('.people-bottom-tools [data-control-key="export"]').is_hidden()
    keys = bar.locator('.people-bottom-tools>button:not([hidden])').evaluate_all('es => es.map(e => e.dataset.controlKey)')
    assert keys.index('bought') < keys.index('sold')
    bar.locator('.people-home-logo').press('Escape')
    assert bar.locator('.people-bottom-tools').is_hidden()
    page.reload(wait_until='domcontentloaded')
    open_operations(page)
    bar.locator('.people-home-logo').click()
    assert bar.locator('.people-bottom-tools [data-control-key="print"]').is_visible()
    assert bar.locator('.people-bottom-tools [data-control-key="export"]').is_hidden()
    page.evaluate("document.querySelectorAll('#sector-content .record').forEach((row,i)=>{row.dataset.date=i%2?'2026-11-03':'2026-11-01';row.classList.add('dated-row')})")
    page.wait_for_timeout(200)
    bar.locator('.people-date-control').click()
    period = bar.locator('.people-date-panel')
    dates = period.locator('[data-date-display]')
    dates.nth(0).fill('011126')
    dates.nth(1).fill('021126')
    period.locator('.people-date-search').click()
    assert period.is_hidden()
    assert page.locator('#sector-content .record:not([hidden])').count() == (len(original) + 1) // 2
    bar.locator('.people-date-control').click()
    period.locator('.people-date-clear').click()
    assert page.locator('#sector-content .record:not([hidden])').count() == len(original)
    period.locator('.people-date-close').click()
    page.evaluate("showFinancialGroup('mercadorias', undefined, financialGroups.mercadorias[0].id)")
    page.wait_for_timeout(200)
    bar.locator('.people-back-control').click()
    assert page.locator('#sector-title').inner_text() == 'MER - Grupos de Mercadorias'
    bar.locator('.people-search-toggle').click()
    native = bar.locator('.people-bottom-search input:visible')
    native.fill('inexistente')
    page.wait_for_timeout(100)
    assert page.locator('.financial-list .account-list-row').count() == 0
    native.fill('')
    page.wait_for_timeout(100)
    assert page.locator('.financial-list .account-list-row').count() > 0
    native.press('Escape')
    page.evaluate('showSalaryUpdate()')
    page.wait_for_timeout(200)
    page.locator('#salary-start-display').fill('311126')
    bar.locator('.people-save-control').click()
    assert not page.evaluate("JSON.parse(localStorage.getItem('cicluz-salarios-vigencias-v1') || '[]').length")
    page.locator('#salary-start-display').fill('021126')
    page.locator('#salary-list input').first.fill('10000')
    bar.locator('.people-save-control').click()
    history = page.evaluate("JSON.parse(localStorage.getItem('cicluz-salarios-vigencias-v1') || '[]')")
    assert history and history[-1]['start'] == '2026-11-02'
    bar.locator('.people-header-toggle').click()
    assert page.locator('.view.show').evaluate('e => e.classList.contains("people-top-hidden")')
    bar.locator('.people-header-toggle').click()
    assert not page.locator('.view.show').evaluate('e => e.classList.contains("people-top-hidden")')
    page.evaluate("const dialog=document.createElement('dialog');dialog.id='footer-test';dialog.innerHTML='<h2>Teste de diálogo</h2><form><label>Nome<input required></label><button type=submit>Salvar</button></form>';document.body.append(dialog);dialog.showModal()")
    page.wait_for_timeout(200)
    page.locator('#footer-test .people-close-control').click()
    assert not page.locator('#footer-test').evaluate('e => e.open')
    bar.locator('.people-start-control').click()
    assert page.locator('body').evaluate('e => e.classList.contains("mobile-menu-visible")')
    assert not errors, errors
    page.close()
    print('PASS sorting, search, preferences, reorder, reload, dates, back, save, validation, dialog and home', flush=True)


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--url', default='http://127.0.0.1:8000/dist/index.html')
    args = parser.parse_args()
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(executable_path=shutil.which('chromium'), args=['--no-sandbox'])
        check_actions(browser, args.url)
        print('PASS layout combinations:', check_layout(browser, args.url), flush=True)
        browser.close()
