"""Check the exported Arabic documents before publishing them."""
from pathlib import Path
from pypdf import PdfReader

root = Path(__file__).resolve().parent.parent
for filename, expected_pages in [
    ('Naif-Almohammdi-CV-AR.pdf', 6),
    ('Naif-Almohammdi-CV-AR-Short.pdf', 2),
]:
    reader = PdfReader(root / filename)
    assert len(reader.pages) == expected_pages, f'{filename}: expected {expected_pages} pages'
    assert reader.trailer['/Root'].get('/StructTreeRoot'), f'{filename}: missing document tags'
    for number, page in enumerate(reader.pages, 1):
        assert 594 <= float(page.mediabox.width) <= 596
        assert 841 <= float(page.mediabox.height) <= 843
        assert len(page.extract_text().strip()) > 100, f'{filename}: empty page {number}'
        for font in page['/Resources']['/Font'].values():
            font = font.get_object()
            descendants = font.get('/DescendantFonts', [font])
            for descendant in descendants:
                descriptor = descendant.get_object().get('/FontDescriptor')
                assert descriptor, f'{filename}: font descriptor missing'
                descriptor = descriptor.get_object()
                assert any(key in descriptor for key in ('/FontFile','/FontFile2','/FontFile3')), f'{filename}: unembedded font'
        links = [a.get_object().get('/A', {}) for a in page.get('/Annots', [])]
        assert any(a.get('/URI') == 'https://almohammdin.github.io/mycv/' for a in links), f'{filename}: missing website link on page {number}'
    print(f'{filename}: {expected_pages} A4 pages; embedded fonts, selectable text, tags and links verified')
