<%@ page import="java.time.LocalDateTime" %>
<%@ page contentType="text/html;charset=UTF-8" language="java" %>
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Compliance Report</title>
    <style>
      body {
        margin: 0;
        padding: 32px;
        color: #111827;
        font-family: Arial, sans-serif;
      }

      header {
        border-bottom: 3px solid #2563eb;
        margin-bottom: 24px;
        padding-bottom: 16px;
      }

      h1 {
        margin: 0 0 8px;
        font-size: 28px;
      }

      p {
        margin: 4px 0;
        color: #4b5563;
      }

      table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 20px;
      }

      th,
      td {
        border: 1px solid #d1d5db;
        padding: 10px;
        text-align: left;
      }

      th {
        background: #eff6ff;
      }

      .seal {
        margin-top: 42px;
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 24px;
      }

      .line {
        border-top: 1px solid #111827;
        padding-top: 8px;
      }

      @media print {
        body {
          padding: 18mm;
        }
      }
    </style>
  </head>
  <body>
    <header>
      <h1>Smart City Compliance Report</h1>
      <p>Generated: <%= LocalDateTime.now() %></p>
      <p>Zone: <%= request.getParameter("zoneId") != null ? request.getParameter("zoneId") : "All Zones" %></p>
      <p>Period: <%= request.getParameter("range") != null ? request.getParameter("range") : "7d" %></p>
    </header>

    <section>
      <h2>Official Summary</h2>
      <p>
        This printable submission summarizes sensor readings, threshold alerts, and compliance status for city
        operations. Populate the rows from the Express report endpoint before final submission.
      </p>
      <table>
        <thead>
          <tr>
            <th>Zone</th>
            <th>Metric</th>
            <th>Average</th>
            <th>Maximum</th>
            <th>Threshold Breaches</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td colspan="6">Report data is supplied by /api/reports/compliance.</td>
          </tr>
        </tbody>
      </table>
    </section>

    <section class="seal">
      <div class="line">Prepared By</div>
      <div class="line">Authorizing Officer</div>
    </section>
  </body>
</html>
