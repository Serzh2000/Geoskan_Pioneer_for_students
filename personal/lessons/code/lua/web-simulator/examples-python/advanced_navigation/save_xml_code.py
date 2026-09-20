def save_xml(self, filename):
    xml_content = f"""<?xml version="1.0" encoding="UTF-8"?>
<map>
    <name>{self.name}</name>
    <origin>
        <lat>{self.origin_lat}</lat>
        <lon>{self.origin_lon}</lon>
    </origin>
    <markers>
"""
    for m in self.markers:
        xml_content += f"""        <marker id="{m.id}">
            <size>{m.size}</size>
            <position>
                <x>{m.x}</x>
                <y>{m.y}</y>
                <z>{m.z}</z>
            </position>
            <orientation>
                <yaw>{m.yaw}</yaw>
            </orientation>
        </marker>
"""
    xml_content += """    </markers>
</map>"""
    with open(filename, 'w') as f:
        f.write(xml_content)
