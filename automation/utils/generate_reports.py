import os
import xml.etree.ElementTree as ET
import pandas as pd
from datetime import datetime

def generate_reports():
    results_file = "reports/results.xml"
    if not os.path.exists(results_file):
        print(f"Results file {results_file} not found. Skipping report generation.")
        return

    tree = ET.parse(results_file)
    root = tree.getroot()

    test_cases = []
    total = passed = failed = skipped = 0
    duration = 0.0

    # Parse JUnit XML
    for testsuite in root.iter('testsuite'):
        total += int(testsuite.get('tests', 0))
        failed += int(testsuite.get('failures', 0)) + int(testsuite.get('errors', 0))
        skipped += int(testsuite.get('skipped', 0))
        duration += float(testsuite.get('time', 0.0))

        for testcase in testsuite.iter('testcase'):
            case_data = {
                'Test ID': testcase.get('name'),
                'Module': testcase.get('classname'),
                'Execution Time': float(testcase.get('time', 0.0)),
                'Status': 'Pass',
                'Failure Reason': ''
            }
            
            failure = testcase.find('failure')
            if failure is not None:
                case_data['Status'] = 'Fail'
                case_data['Failure Reason'] = failure.get('message', 'Unknown failure')
            elif testcase.find('skipped') is not None:
                case_data['Status'] = 'Skip'
                
            test_cases.append(case_data)

    passed = total - failed - skipped
    success_rate = (passed / total * 100) if total > 0 else 0

    # Generate Excel Report
    df = pd.DataFrame(test_cases)
    os.makedirs('reports/Excel', exist_ok=True)
    
    with pd.ExcelWriter('reports/Excel/Automation_Test_Report.xlsx') as writer:
        df.to_excel(writer, sheet_name='Executed Test Cases', index=False)
        if not df.empty:
            df[df['Status'] == 'Pass'].to_excel(writer, sheet_name='Passed Tests', index=False)
            df[df['Status'] == 'Fail'].to_excel(writer, sheet_name='Failed Tests', index=False)
            df[df['Status'] == 'Skip'].to_excel(writer, sheet_name='Skipped Tests', index=False)

        # Execution Metrics
        metrics = pd.DataFrame([{
            'Total Tests': total,
            'Passed': passed,
            'Failed': failed,
            'Skipped': skipped,
            'Pass Percentage': f"{success_rate:.2f}%",
            'Execution Duration (s)': round(duration, 2)
        }])
        metrics.to_excel(writer, sheet_name='Execution Metrics', index=False)

    # Generate Summary Markdown
    with open('reports/summary.md', 'w') as f:
        f.write("# Live GitHub Pages E2E Execution Summary\n\n")
        f.write(f"**Execution Date:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
        f.write(f"**Total Test Cases:** {total}\n")
        f.write(f"**Passed:** {passed} ✅\n")
        f.write(f"**Failed:** {failed} ❌\n")
        f.write(f"**Skipped:** {skipped} ⏭️\n")
        f.write(f"**Pass Percentage:** {success_rate:.2f}%\n")
        f.write(f"**Execution Duration:** {round(duration, 2)} seconds\n\n")
        
        if failed > 0:
            f.write("## Failed Tests\n")
            for t in [t for t in test_cases if t['Status'] == 'Fail']:
                f.write(f"- **{t['Test ID']}**: {t['Failure Reason']}\n")

    print(f"Report generated: {total} total, {passed} passed, {failed} failed.")

if __name__ == '__main__':
    generate_reports()
