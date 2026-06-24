import sys
import zipfile
import xml.etree.ElementTree as ET

def extract_section(file_path, start_idx, end_idx):
    try:
        with zipfile.ZipFile(file_path) as docx:
            xml_content = docx.read('word/document.xml')
            root = ET.fromstring(xml_content)
            
            text_parts = []
            p_index = 0
            for child in root.iter():
                if child.tag.endswith('}p'):
                    p_index += 1
                    if start_idx <= p_index <= end_idx:
                        p_text = ''.join(node.text for node in child.iter() if node.tag.endswith('}t') and node.text).strip()
                        if p_text:
                            text_parts.append(f"[{p_index}] {p_text}")
                elif child.tag.endswith('}tr') and start_idx <= p_index <= end_idx:
                    cells = []
                    for cell in child.findall('.//{http://schemas.openxmlformats.org/wordprocessingml/2006/main}tc'):
                        cell_text = ''.join(n.text for n in cell.iter() if n.tag.endswith('}t') and n.text)
                        cells.append(cell_text.strip())
                    if cells:
                        text_parts.append(f"[{p_index}] TABLE ROW: " + " | ".join(cells))
            return '\n'.join(text_parts)
    except Exception as e:
        return f"Error: {e}"

if __name__ == '__main__':
    text = extract_section("C:\\Users\\user\\OneDrive - Universidad Tecnologica del Peru\\Desktop\\Curso de Integrador 2\\AvanceFinal\\InformeFinalAvance3.docx", 629, 677)
    with open("hu2_analysis.txt", "w", encoding="utf-8") as f:
        f.write(text)
    print("Extracted HU-002 analysis section.")
