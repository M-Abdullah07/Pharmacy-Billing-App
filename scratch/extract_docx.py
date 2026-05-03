import zipfile
import xml.etree.ElementTree as ET
import os

docx_path = r'c:\Users\Mumtaz\Pharmax\Pharmacy-Billing-App\PharmaX_Report.docx'
output_path = r'c:\Users\Mumtaz\Pharmax\Pharmacy-Billing-App\scratch\report_notes.txt'

def extract_text():
    if not os.path.exists(docx_path):
        print(f"File not found: {docx_path}")
        return

    texts = []
    try:
        with zipfile.ZipFile(docx_path, 'r') as z:
            with z.open('word/document.xml') as f:
                tree = ET.parse(f)
                root = tree.getroot()
                ns = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
                for para in root.iter('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}p'):
                    para_text = []
                    for node in para.iter('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}t'):
                        if node.text:
                            para_text.append(node.text)
                    if para_text:
                        texts.append("".join(para_text))

        with open(output_path, 'w', encoding='utf-8') as out:
            out.write("\n".join(texts))
        print(f"Extracted {len(texts)} paragraphs to {output_path}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    extract_text()
