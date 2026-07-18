import os
from PIL import Image, ImageDraw, ImageFont

def create_diagrams():
    out_dir = "C:\\Users\\user\\.gemini\\antigravity\\brain\\1787c953-38ff-4ac5-bf2e-580d26ca4017\\"
    
    # Fuentes estándar en Windows
    try:
        font_title = ImageFont.truetype("C:\\Windows\\Fonts\\arialbd.ttf", 20)
        font_entity = ImageFont.truetype("C:\\Windows\\Fonts\\arialbd.ttf", 15)
        font_attr = ImageFont.truetype("C:\\Windows\\Fonts\\arial.ttf", 13)
        font_attr_bold = ImageFont.truetype("C:\\Windows\\Fonts\\arialbd.ttf", 13)
        font_diamond = ImageFont.truetype("C:\\Windows\\Fonts\\arial.ttf", 13)
        font_badge = ImageFont.truetype("C:\\Windows\\Fonts\\arialbd.ttf", 12)
        font_text = ImageFont.truetype("C:\\Windows\\Fonts\\arial.ttf", 14)
        font_bold = ImageFont.truetype("C:\\Windows\\Fonts\\arialbd.ttf", 14)
    except IOError:
        font_title = ImageFont.load_default()
        font_entity = ImageFont.load_default()
        font_attr = ImageFont.load_default()
        font_attr_bold = ImageFont.load_default()
        font_diamond = ImageFont.load_default()
        font_badge = ImageFont.load_default()
        font_text = ImageFont.load_default()
        font_bold = ImageFont.load_default()

    # Helper para dibujar líneas con cabezas de flecha
    def draw_arrow(draw, points, color=(200, 200, 200), width=2, head_size=8):
        for i in range(len(points) - 1):
            draw.line([points[i], points[i+1]], fill=color, width=width)
        x1, y1 = points[-2]
        x2, y2 = points[-1]
        if x1 == x2: # Vertical
            if y2 > y1: # Abajo
                draw.polygon([(x2 - head_size, y2 - head_size), (x2 + head_size, y2 - head_size), (x2, y2)], fill=color)
            else: # Arriba
                draw.polygon([(x2 - head_size, y2 + head_size), (x2 + head_size, y2 + head_size), (x2, y2)], fill=color)
        elif y1 == y2: # Horizontal
            if x2 > x1: # Derecha
                draw.polygon([(x2 - head_size, y2 - head_size), (x2 - head_size, y2 + head_size), (x2, y2)], fill=color)
            else: # Izquierda
                draw.polygon([(x2 + head_size, y2 - head_size), (x2 + head_size, y2 + head_size), (x2, y2)], fill=color)    # ═══════════════════════════════════════════════════════════════════════════
    # 1. DIAGRAMA DE ACTIVIDADES (hu014_actividades.png)
    # ═══════════════════════════════════════════════════════════════════════════
    img_act = Image.new("RGB", (900, 1400), (26, 26, 26))
    draw_act = ImageDraw.Draw(img_act)
    
    draw_act.text((20, 20), "Diagrama de Actividades - Actualizar Ficha de Equipo HU-014", fill=(255, 255, 255), font=font_title)
    draw_act.rectangle([(15, 15), (885, 1385)], outline=(60, 60, 60), width=2)
    
    # Carriles: Jefe de TI (izquierda) | Sistema (derecha)
    draw_act.line([(450, 70), (450, 1350)], fill=(100, 100, 100), width=2)
    draw_act.text((160, 75), "Jefe de TI", fill=(130, 200, 250), font=font_bold)
    draw_act.text((590, 75), "Sistema (Servicio/BD)", fill=(150, 230, 180), font=font_bold)
    draw_act.line([(15, 100), (885, 100)], fill=(100, 100, 100), width=1)
    
    # Start Circle (Jefe de TI)
    draw_act.ellipse([(210, 120), (240, 150)], fill=(0, 255, 0))
    
    # Act1: Hacer clic en editar
    draw_act.rounded_rectangle([(115, 180), (335, 230)], radius=8, fill=(253, 235, 208), outline=(211, 84, 0), width=2)
    draw_act.text((120, 195), "Clic en 'Editar' en tarjeta de equipo", fill=(0, 0, 0), font=font_text)
    
    # s_cargar: Cargar modal y datos
    draw_act.rounded_rectangle([(565, 180), (785, 230)], radius=8, fill=(214, 234, 248), outline=(41, 128, 185), width=2)
    draw_act.text((575, 195), "Cargar modal, precargar ficha", fill=(0, 0, 0), font=font_text)
    
    # a_modificar: Modificar campos
    draw_act.rounded_rectangle([(115, 280), (335, 330)], radius=8, fill=(253, 235, 208), outline=(211, 84, 0), width=2)
    draw_act.text((120, 295), "Modificar campos e ingresar obs.", fill=(0, 0, 0), font=font_text)
    
    # a_guardar: Guardar
    draw_act.rounded_rectangle([(115, 380), (335, 430)], radius=8, fill=(253, 235, 208), outline=(211, 84, 0), width=2)
    draw_act.text((135, 395), "Clic en 'Guardar Cambios'", fill=(0, 0, 0), font=font_text)
    
    # s_verificar: Verificar rol Jefe de TI
    draw_act.rounded_rectangle([(565, 380), (785, 430)], radius=8, fill=(214, 234, 248), outline=(41, 128, 185), width=2)
    draw_act.text((590, 395), "Verificar rol Jefe de TI", fill=(0, 0, 0), font=font_text)
    
    # dec_rol
    draw_act.polygon([(675, 480), (745, 520), (675, 560), (605, 520)], fill=(254, 243, 199), outline=(217, 119, 6), width=2)
    draw_act.text((630, 512), "¿Es Jefe de TI?", fill=(0, 0, 0), font=font_text)
    
    # s_err_rol
    draw_act.rounded_rectangle([(735, 580), (875, 630)], radius=8, fill=(253, 237, 237), outline=(239, 68, 68), width=2)
    draw_act.text((745, 595), "Error: Acceso Denegado", fill=(0, 0, 0), font=font_text)
    
    # End error rol
    draw_act.ellipse([(790, 660), (820, 690)], fill=(255, 255, 255), outline=(0,0,0), width=1)
    draw_act.ellipse([(795, 665), (815, 685)], fill=(0, 0, 0))
    
    # dec_serie
    draw_act.polygon([(675, 610), (745, 650), (675, 690), (605, 650)], fill=(254, 243, 199), outline=(217, 119, 6), width=2)
    draw_act.text((620, 642), "¿N/S Duplicado?", fill=(0, 0, 0), font=font_text)
    
    # s_err_serie
    draw_act.rounded_rectangle([(735, 710), (875, 760)], radius=8, fill=(253, 237, 237), outline=(239, 68, 68), width=2)
    draw_act.text((740, 725), "Error: Serie Duplicada", fill=(0, 0, 0), font=font_text)
    
    # End error serie
    draw_act.ellipse([(790, 790), (820, 820)], fill=(255, 255, 255), outline=(0,0,0), width=1)
    draw_act.ellipse([(795, 795), (815, 815)], fill=(0, 0, 0))

    # dec_estado
    draw_act.polygon([(675, 740), (745, 780), (675, 820), (605, 780)], fill=(254, 243, 199), outline=(217, 119, 6), width=2)
    draw_act.text((620, 772), "¿Cambió Estado?", fill=(0, 0, 0), font=font_text)
    
    # dec_obs
    draw_act.polygon([(500, 830), (570, 870), (500, 910), (430, 870)], fill=(254, 243, 199), outline=(217, 119, 6), width=2)
    draw_act.text((460, 862), "¿Obs. vacía?", fill=(0, 0, 0), font=font_text)

    # s_err_obs
    draw_act.rounded_rectangle([(290, 845), (410, 895)], radius=8, fill=(253, 237, 237), outline=(239, 68, 68), width=2)
    draw_act.text((295, 855), "Error: Observación\n   es requerida", fill=(0, 0, 0), font=font_text)

    # End error obs
    draw_act.ellipse([(220, 920), (250, 950)], fill=(255, 255, 255), outline=(0,0,0), width=1)
    draw_act.ellipse([(225, 925), (245, 945)], fill=(0, 0, 0))

    # s_historial: Insertar en historial_estado_equipo
    draw_act.rounded_rectangle([(410, 960), (590, 1010)], radius=8, fill=(214, 234, 248), outline=(41, 128, 185), width=2)
    draw_act.text((420, 975), "Registrar historial de estado", fill=(0, 0, 0), font=font_text)
    
    # s_update: Actualizar en equipos_informaticos
    draw_act.rounded_rectangle([(565, 1080), (785, 1130)], radius=8, fill=(214, 234, 248), outline=(41, 128, 185), width=2)
    draw_act.text((580, 1095), "Actualizar ficha en la BD", fill=(0, 0, 0), font=font_text)
    
    # a_confirmar: Mostrar confirmación
    draw_act.rounded_rectangle([(115, 1170), (335, 1220)], radius=8, fill=(209, 250, 229), outline=(5, 150, 105), width=2)
    draw_act.text((135, 1185), "Ver confirmación visual", fill=(0, 0, 0), font=font_text)
    
    # End node (Éxito)
    draw_act.ellipse([(210, 1270), (240, 1300)], fill=(255, 255, 255), outline=(0,0,0), width=1)
    draw_act.ellipse([(215, 1275), (235, 1295)], fill=(0, 0, 0))
    
    # Connectors
    draw_arrow(draw_act, [(225, 150), (225, 180)])
    draw_arrow(draw_act, [(335, 205), (565, 205)])
    draw_arrow(draw_act, [(675, 230), (675, 255), (225, 255), (225, 280)])
    draw_arrow(draw_act, [(225, 330), (225, 380)])
    draw_arrow(draw_act, [(335, 405), (565, 405)])
    draw_arrow(draw_act, [(675, 430), (675, 480)])
    
    # dec_rol -> No
    draw_arrow(draw_act, [(745, 520), (810, 520), (810, 580)])
    draw_act.text((760, 500), "No", fill=(255, 100, 100), font=font_text)
    draw_arrow(draw_act, [(810, 630), (810, 660)])
    
    # dec_rol -> Sí
    draw_arrow(draw_act, [(675, 560), (675, 610)])
    draw_act.text((685, 575), "Sí", fill=(100, 255, 100), font=font_text)
    
    # dec_serie -> Sí
    draw_arrow(draw_act, [(745, 650), (810, 650), (810, 710)])
    draw_act.text((760, 630), "Sí", fill=(255, 100, 100), font=font_text)
    draw_arrow(draw_act, [(810, 760), (810, 790)])
    
    # dec_serie -> No
    draw_arrow(draw_act, [(675, 690), (675, 740)])
    draw_act.text((685, 705), "No", fill=(100, 255, 100), font=font_text)
    
    # dec_estado -> Sí
    draw_arrow(draw_act, [(605, 780), (500, 780), (500, 830)])
    draw_act.text((540, 760), "Sí", fill=(130, 200, 250), font=font_text)
    
    # dec_obs -> Sí (observación vacía)
    draw_arrow(draw_act, [(430, 870), (410, 870)])
    draw_act.text((415, 850), "Sí", fill=(255, 100, 100), font=font_text)
    draw_arrow(draw_act, [(350, 895), (350, 935), (250, 935)])
    
    # dec_obs -> No (observación completa)
    draw_arrow(draw_act, [(500, 910), (500, 960)])
    draw_act.text((510, 925), "No", fill=(100, 255, 100), font=font_text)
    
    # dec_estado -> No
    draw_arrow(draw_act, [(675, 820), (675, 1080)])
    draw_act.text((685, 840), "No", fill=(100, 255, 100), font=font_text)
    
    # s_historial -> s_update
    draw_arrow(draw_act, [(500, 1010), (500, 1050), (675, 1050), (675, 1080)])
    
    # s_update -> a_confirmar
    draw_arrow(draw_act, [(675, 1130), (675, 1150), (225, 1150), (225, 1170)])
    
    # Confirmar -> End Success
    draw_arrow(draw_act, [(225, 1220), (225, 1270)])
    
    img_act.save(os.path.join(out_dir, "hu014_actividades.png"))

    # ═══════════════════════════════════════════════════════════════════════════
    # 2. DIAGRAMA DE CASOS DE USO (hu014_casos_uso.png)
    # ═══════════════════════════════════════════════════════════════════════════
    img_uc = Image.new("RGB", (800, 600), (26, 26, 26))
    draw_uc = ImageDraw.Draw(img_uc)
    
    draw_uc.text((20, 20), "Diagrama de Casos de Uso - Actualizar Ficha de Equipo HU-014", fill=(255, 255, 255), font=font_title)
    draw_uc.rectangle([(15, 15), (785, 585)], outline=(60, 60, 60), width=2)
    
    # System boundary box
    draw_uc.rectangle([(180, 80), (740, 530)], outline=(81, 140, 248), width=2)
    draw_uc.text((200, 95), "Sistema de Gestión SLA - Inventario", fill=(129, 140, 248), font=font_bold)
    
    # Actor: Jefe de TI (Stick figure)
    # Head
    draw_uc.ellipse([(75, 220), (105, 250)], outline=(255, 255, 255), width=2)
    # Body
    draw_uc.line([(90, 250), (90, 310)], fill=(255, 255, 255), width=2)
    # Arms
    draw_uc.line([(70, 270), (110, 270)], fill=(255, 255, 255), width=2)
    # Legs
    draw_uc.line([(90, 310), (75, 350)], fill=(255, 255, 255), width=2)
    draw_uc.line([(90, 310), (105, 350)], fill=(255, 255, 255), width=2)
    draw_uc.text((60, 365), "Jefe de TI", fill=(255, 255, 255), font=font_bold)
    
    # Use cases
    # UC1: Actualizar ficha
    draw_uc.ellipse([(220, 260), (450, 330)], fill=(36, 36, 36), outline=(129, 140, 248), width=2)
    draw_uc.text((235, 280), "Actualizar ficha de equipo\n         (CU-014)", fill=(255, 255, 255), font=font_bold)
    
    # UC2: Validar número de serie duplicado
    draw_uc.ellipse([(510, 160), (710, 220)], fill=(36, 36, 36), outline=(129, 140, 248), width=1)
    draw_uc.text((525, 180), "Validar duplicidad N/S", fill=(255, 255, 255), font=font_attr)
    
    # UC3: Registrar historial de estados
    draw_uc.ellipse([(510, 350), (710, 410)], fill=(36, 36, 36), outline=(129, 140, 248), width=1)
    draw_uc.text((520, 370), "Registrar historial de estados", fill=(255, 255, 255), font=font_attr)
    
    # Relationships
    draw_uc.line([(110, 280), (220, 290)], fill=(255, 255, 255), width=2)
    
    # Include search/filters
    draw_uc.line([(390, 265), (510, 205)], fill=(165, 180, 252), width=1)
    draw_uc.text((430, 220), "«include»", fill=(165, 180, 252), font=font_attr)
    
    # Include details view
    draw_uc.line([(395, 325), (515, 365)], fill=(165, 180, 252), width=1)
    draw_uc.text((430, 350), "«include»", fill=(165, 180, 252), font=font_attr)
    
    img_uc.save(os.path.join(out_dir, "hu014_casos_uso.png"))

    # ═══════════════════════════════════════════════════════════════════════════
    # 3. DIAGRAMA DE SECUENCIA (hu014_secuencia.png)
    # ═══════════════════════════════════════════════════════════════════════════
    img_seq = Image.new("RGB", (1050, 800), (26, 26, 26))
    draw_seq = ImageDraw.Draw(img_seq)
    
    draw_seq.text((20, 20), "Diagrama de Secuencia - Actualizar Ficha de Equipo HU-014", fill=(255, 255, 255), font=font_title)
    draw_seq.rectangle([(15, 15), (1035, 785)], outline=(60, 60, 60), width=2)
    
    lx = {
        "user": 100,
        "modal": 300,
        "service": 550,
        "repo": 780,
        "hist": 960
    }
    
    # Lifeline boxes
    draw_seq.rectangle([(lx["user"] - 50, 80), (lx["user"] + 50, 120)], fill=(44, 62, 80), outline=(255, 255, 255), width=2)
    draw_seq.text((lx["user"] - 42, 92), "Jefe TI :Actor", fill=(255, 255, 255), font=font_bold)
    
    draw_seq.rectangle([(lx["modal"] - 65, 80), (lx["modal"] + 65, 120)], fill=(44, 62, 80), outline=(255, 255, 255), width=2)
    draw_seq.text((lx["modal"] - 55, 92), "EditarEquipoModal", fill=(255, 255, 255), font=font_bold)
    
    draw_seq.rectangle([(lx["service"] - 65, 80), (lx["service"] + 65, 120)], fill=(44, 62, 80), outline=(255, 255, 255), width=2)
    draw_seq.text((lx["service"] - 55, 92), "EquiposService", fill=(255, 255, 255), font=font_bold)
    
    draw_seq.rectangle([(lx["repo"] - 65, 80), (lx["repo"] + 65, 120)], fill=(44, 62, 80), outline=(255, 255, 255), width=2)
    draw_seq.text((lx["repo"] - 55, 92), "EquiposRepository", fill=(255, 255, 255), font=font_bold)

    draw_seq.rectangle([(lx["hist"] - 65, 80), (lx["hist"] + 65, 120)], fill=(44, 62, 80), outline=(255, 255, 255), width=2)
    draw_seq.text((lx["hist"] - 55, 92), "HistorialRepository", fill=(255, 255, 255), font=font_bold)
    
    for key, x in lx.items():
        draw_seq.line([(x, 120), (x, 750)], fill=(120, 120, 120), width=1)
        
    def draw_activation(x, y, h):
        draw_seq.rectangle([(x - 8, y), (x + 8, y + h)], fill=(255, 255, 255), outline=(0,0,0), width=1)
        
    draw_activation(lx["modal"], 150, 560)
    draw_activation(lx["service"], 200, 480)
    draw_activation(lx["repo"], 250, 400)
    draw_activation(lx["hist"], 340, 80)
    
    # 1. Open modal & change fields
    draw_arrow(draw_seq, [(lx["user"], 160), (lx["modal"] - 8, 160)])
    draw_seq.text((120, 140), "1. modificarDatosYGuardar(input, obs)", fill=(255, 255, 255), font=font_text)
    
    # 2. Action trigger
    draw_arrow(draw_seq, [(lx["modal"] + 8, 210), (lx["service"] - 8, 210)])
    draw_seq.text((320, 190), "2. actualizarEquipoAction(id, form, obs)", fill=(255, 255, 255), font=font_text)
    
    # 3. get current details for comparing state
    draw_arrow(draw_seq, [(lx["service"] + 8, 240), (lx["repo"] - 8, 240)])
    draw_seq.text((570, 220), "3. getEquipmentDetails(id)", fill=(255, 255, 255), font=font_text)
    
    # 4. Return current details
    draw_seq.line([(lx["repo"] - 8, 280), (lx["service"] + 8, 280)], fill=(200, 200, 200), width=1)
    draw_seq.text((580, 260), "4. {success: true, data: current}", fill=(200, 200, 200), font=font_text)
    
    # 5. Check duplicate serial if changed
    draw_arrow(draw_seq, [(lx["service"] + 8, 310), (lx["repo"] - 8, 310)])
    draw_seq.text((570, 290), "5. findByNumeroSerie(numero_serie)", fill=(255, 255, 255), font=font_text)
    
    # 6. Return serial check
    draw_seq.line([(lx["repo"] - 8, 340), (lx["service"] + 8, 340)], fill=(200, 200, 200), width=1)
    draw_seq.text((580, 320), "6. null (no duplicado)", fill=(200, 200, 200), font=font_text)
    
    # 7. Insert state history (if state changed)
    draw_arrow(draw_seq, [(lx["service"] + 8, 370), (lx["hist"] - 8, 370)])
    draw_seq.text((570, 350), "7. insert(histData)", fill=(255, 255, 255), font=font_text)
    
    # 8. Return history insert result
    draw_seq.line([(lx["hist"] - 8, 410), (lx["service"] + 8, 410)], fill=(200, 200, 200), width=1)
    draw_seq.text((580, 390), "8. {success: true, data: histObj}", fill=(200, 200, 200), font=font_text)
    
    # 9. Update equipment
    draw_arrow(draw_seq, [(lx["service"] + 8, 450), (lx["repo"] - 8, 450)])
    draw_seq.text((570, 430), "9. update(id, updateData)", fill=(255, 255, 255), font=font_text)
    
    # 10. Return update result
    draw_seq.line([(lx["repo"] - 8, 490), (lx["service"] + 8, 490)], fill=(200, 200, 200), width=1)
    draw_seq.text((580, 470), "10. {success: true, data: updated}", fill=(200, 200, 200), font=font_text)
    
    # 11. Return action result
    draw_seq.line([(lx["service"] - 8, 540), (lx["modal"] + 8, 540)], fill=(200, 200, 200), width=1)
    draw_seq.text((330, 520), "11. {success: true, data: updated}", fill=(200, 200, 200), font=font_text)
    
    # 12. Close modal and show success toast
    draw_seq.line([(lx["modal"] - 8, 600), (lx["user"], 600)], fill=(200, 200, 200), width=1)
    draw_seq.text((120, 580), "12. Cerrar modal y mostrar toast de éxito", fill=(200, 200, 200), font=font_text)
    
    img_seq.save(os.path.join(out_dir, "hu014_secuencia.png"))

    # ═══════════════════════════════════════════════════════════════════════════
    # 4. DIAGRAMA ENTIDAD-RELACIÓN CHEN (hu014_er.png)
    # ═══════════════════════════════════════════════════════════════════════════
    img_er = Image.new("RGB", (1250, 850), (26, 26, 26))
    draw_er = ImageDraw.Draw(img_er)
    
    draw_er.text((20, 20), "Diagrama Entidad-Relación (Notación CHEN) - Actualización de Equipos HU-014", fill=(255, 255, 255), font=font_title)
    draw_er.rectangle([(15, 15), (1235, 835)], outline=(60, 60, 60), width=2)
    
    # Helper functions for ER notation
    def draw_entity(name, x, y, w, h=45):
        draw_er.rectangle([(x, y), (x + w, y + h)], fill=(253, 235, 208), outline=(211, 84, 0), width=2)
        tw = draw_er.textlength(name, font=font_entity)
        draw_er.text((x + (w - tw) // 2, y + (h - 18) // 2), name, fill=(0, 0, 0), font=font_entity)
        
    def draw_attribute(name, x, y, w, h=30, is_pk=False):
        draw_er.rounded_rectangle([(x, y), (x + w, y + h)], radius=12, fill=(255, 255, 255), outline=(127, 140, 141), width=1)
        tw = draw_er.textlength(name, font=font_attr_bold if is_pk else font_attr)
        tx = x + (w - tw) // 2
        ty = y + (h - 15) // 2
        draw_er.text((tx, ty), name, fill=(0, 0, 0), font=font_attr_bold if is_pk else font_attr)
        if is_pk:
            draw_er.line([(tx, ty + 14), (tx + tw, ty + 14)], fill=(0, 0, 0), width=1)
            
    def draw_diamond(name, cx, cy, w=130, h=70):
        half_w = w // 2
        half_h = h // 2
        points = [(cx, cy - half_h), (cx + half_w, cy), (cx, cy + half_h), (cx - half_w, cy)]
        draw_er.polygon(points, fill=(214, 234, 248), outline=(41, 128, 185), width=2)
        tw = draw_er.textlength(name, font=font_diamond)
        draw_er.text((cx - tw // 2, cy - 8), name, fill=(0, 0, 0), font=font_diamond)
        
    def draw_badge(text, cx, cy):
        bw, bh = 22, 22
        draw_er.rectangle([(cx - bw//2, cy - bh//2), (cx + bw//2, cy + bh//2)], fill=(44, 62, 80))
        tw = draw_er.textlength(text, font=font_badge)
        draw_er.text((cx - tw // 2, cy - 7), text, fill=(255, 255, 255), font=font_badge)

    # Connection lines
    # EQUIPOS attributes
    draw_er.line([(625, 410), (450, 270)], fill=(120, 120, 120), width=1) # id_equipo
    draw_er.line([(625, 410), (560, 270)], fill=(120, 120, 120), width=1) # codigo
    draw_er.line([(625, 410), (670, 270)], fill=(120, 120, 120), width=1) # nombre
    draw_er.line([(625, 410), (780, 270)], fill=(120, 120, 120), width=1) # estado_operativo
    
    # HISTORIAL attributes
    draw_er.line([(625, 590), (430, 720)], fill=(120, 120, 120), width=1) # id_historial
    draw_er.line([(625, 590), (540, 720)], fill=(120, 120, 120), width=1) # estado_anterior
    draw_er.line([(625, 590), (650, 720)], fill=(120, 120, 120), width=1) # estado_nuevo
    draw_er.line([(625, 590), (760, 720)], fill=(120, 120, 120), width=1) # observacion
    draw_er.line([(625, 590), (870, 720)], fill=(120, 120, 120), width=1) # fecha_cambio
    
    # PERFIL attributes
    draw_er.line([(180, 410), (100, 300)], fill=(120, 120, 120), width=1) # id_perfil
    draw_er.line([(180, 410), (220, 300)], fill=(120, 120, 120), width=1) # id_rol
    
    # Relationship connections
    # PERFIL - Registra/Modifica - EQUIPO
    draw_er.line([(280, 432), (340, 432)], fill=(200, 200, 200), width=2)
    draw_er.line([(470, 432), (525, 432)], fill=(200, 200, 200), width=2)
    
    # EQUIPO - Tiene - HISTORIAL
    draw_er.line([(625, 455), (625, 485)], fill=(200, 200, 200), width=2)
    draw_er.line([(625, 555), (625, 565)], fill=(200, 200, 200), width=2)
    
    # PERFIL - Registra - HISTORIAL (Línea en diagonal o codo)
    draw_er.line([(180, 455), (180, 520), (560, 520)], fill=(200, 200, 200), width=2)

    # Entities
    draw_entity("PERFIL", 100, 410, 180)
    draw_entity("EQUIPO_INFORMATICO", 525, 410, 200)
    draw_entity("HISTORIAL_ESTADO_EQUIPO", 500, 565, 250)
    
    # Relationships
    draw_diamond("Modifica", 405, 432)
    draw_diamond("Tiene", 625, 520, w=100, h=70)
    
    # Badges
    draw_badge("1", 300, 415)
    draw_badge("N", 510, 415)
    
    draw_badge("1", 640, 465)
    draw_badge("N", 640, 545)
    
    # Attributes
    draw_attribute("id_equipo", 380, 240, 110, is_pk=True)
    draw_attribute("codigo", 510, 240, 90)
    draw_attribute("nombre", 620, 240, 90)
    draw_attribute("estado_operativo", 725, 240, 140)
    
    draw_attribute("id_historial", 360, 720, 110, is_pk=True)
    draw_attribute("estado_anterior", 480, 720, 120)
    draw_attribute("estado_nuevo", 610, 720, 110)
    draw_attribute("observacion", 730, 720, 110)
    draw_attribute("fecha_cambio", 850, 720, 110)
    
    draw_attribute("id_perfil", 50, 270, 100, is_pk=True)
    draw_attribute("id_rol", 170, 270, 90)
    
    img_er.save(os.path.join(out_dir, "hu014_er.png"))
    print("Todos los diagramas para HU-014 creados con éxito.")

if __name__ == "__main__":
    create_diagrams()
