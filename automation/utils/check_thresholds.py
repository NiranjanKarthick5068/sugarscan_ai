import sys
import xml.etree.ElementTree as ET

def check_thresholds():
    try:
        tree = ET.parse("reports/results.xml")
        root = tree.getroot()
    except Exception as e:
        print("Could not parse results.xml")
        sys.exit(1)

    total = 0
    failed = 0
    
    for testsuite in root.iter('testsuite'):
        total += int(testsuite.get('tests', 0))
        failed += int(testsuite.get('failures', 0)) + int(testsuite.get('errors', 0))

    if total == 0:
        print("No tests ran!")
        sys.exit(1)

    fail_percentage = (failed / total) * 100
    print(f"Test failure rate: {fail_percentage:.2f}% ({failed}/{total})")

    # Workflow should fail if more than 5% critical test cases fail
    if fail_percentage > 5.0:
        print("Failure rate exceeds 5% threshold. Failing workflow.")
        sys.exit(1)
        
    print("Pass threshold met.")
    sys.exit(0)

if __name__ == '__main__':
    check_thresholds()
