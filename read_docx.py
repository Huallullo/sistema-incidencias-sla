import sys
import zipfile
import xml.etree.ElementTree as ET

def read_docx(file_path):
    try:
        with zipfile.ZipFile(file_path) as docx:
            xml_content = docx.read('word/document.xml')
            root = ET.fromstring(xml_content)
            
            text_parts = []
            for child in root.iter():
                # w:p is paragraph
                if child.tag.endswith('}p'):
                    p_text = ''.join(node.text for node in child.iter() if node.tag.endswith('}t') and node.text)
                    if p_text.strip():
                        text_parts.append(p_text.strip())
                # w:tr is table row
                elif child.tag.endswith('}tr'):
                    cells = []
                    for cell in child.findall('.//{http://schemas.openxmlformats.org/wordprocessingml/2006/main}tc'):
                        cell_text = ''.join(n.text for n in cell.iter() if n.tag.endswith('}t') and n.text)
                        cells.append(cell_text.strip())
                    if cells:
                        text_parts.append(" | ".join(cells))
            return '\n'.join(text_parts)
    except Exception as e:
        return f"Error reading docx: {e}"

if __name__ == '__main__':
    if len(sys.argv) < 3:
        print("Usage: python read_docx.py <docx_path> <output_txt_path>")
        sys.exit(1)
    
    text = read_docx(sys.argv[1])
    with open(sys.argv[2], 'w', encoding='utf-8') as f:
        f.write(text)
    print(f"Successfully wrote extracted text to {sys.argv[2]}")
