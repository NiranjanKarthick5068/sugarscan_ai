import xml.etree.ElementTree as ET
import pandas as pd
import sys

def generate_report(xml_path, output_excel):
    try:
        tree = ET.parse(xml_path)
        root = tree.getroot()
    except Exception as e:
        print(f"Failed to parse XML: {e}")
        return

    testsuite = root.find('.//testsuite')
    if testsuite is None:
        print("No testsuite found.")
        return

    total_tests = int(testsuite.get('tests', 0))
    failed_tests = int(testsuite.get('failures', 0)) + int(testsuite.get('errors', 0))
    passed_tests = total_tests - failed_tests

    data = []
    for case in root.findall('.//testcase'):
        name = case.get('name', 'Unknown')
        time_val = float(case.get('time', '0'))
        
        status = "Passed ✅"
        if case.find('failure') is not None or case.find('error') is not None:
            status = "Failed ❌"
            
        data.append({
            "Test ID": name,
            "Module": "Backend API" if "integration" in name else "Other",
            "Test Name": name.replace('_', ' ').title(),
            "Status": status,
            "Execution Time (s)": round(time_val, 4)
        })

    df_details = pd.DataFrame(data)

    pass_rate = "100% 🎯" if total_tests > 0 and failed_tests == 0 else f"{int((passed_tests/total_tests)*100)}%"
    
    df_summary = pd.DataFrame([
        {"Metric": "Total Tests Run", "Value": total_tests},
        {"Metric": "Total Passed", "Value": passed_tests},
        {"Metric": "Total Failed", "Value": failed_tests},
        {"Metric": "Pass Rate", "Value": pass_rate}
    ])

    with pd.ExcelWriter(output_excel, engine="openpyxl") as writer:
        df_summary.to_excel(writer, sheet_name="Summary", index=False)
        df_details.to_excel(writer, sheet_name="Test Details", index=False)

    print(f"Successfully generated {output_excel} with {total_tests} tests.")

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python generate_excel_report.py <junit.xml> <output.xlsx>")
        sys.exit(1)
    generate_report(sys.argv[1], sys.argv[2])
