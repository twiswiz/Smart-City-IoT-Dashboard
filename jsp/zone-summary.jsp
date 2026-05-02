<%@ page import="java.time.LocalDateTime" %>
<%@ page contentType="text/html;charset=UTF-8" language="java" %>
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Zone Summary</title>
    <style>
      body {
        margin: 0;
        padding: 32px;
        color: #111827;
        font-family: Arial, sans-serif;
      }

      header {
        display: flex;
        justify-content: space-between;
        gap: 24px;
        border-bottom: 2px solid #111827;
        padding-bottom: 16px;
      }

      h1 {
        margin: 0;
      }

      .grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 14px;
        margin: 24px 0;
      }

      .box {
        border: 1px solid #d1d5db;
        padding: 14px;
      }

      .box strong {
        display: block;
        margin-bottom: 8px;
        color: #2563eb;
      }

      table {
        width: 100%;
        border-collapse: collapse;
      }

      th,
      td {
        border: 1px solid #d1d5db;
        padding: 10px;
      }

      th {
        background: #f3f4f6;
      }
    </style>
  </head>
  <body>
    <header>
      <div>
        <h1>Zone Summary Printout</h1>
        <p>Zone: <%= request.getParameter("zoneId") != null ? request.getParameter("zoneId") : "central" %></p>
      </div>
      <p>Generated: <%= LocalDateTime.now() %></p>
    </header>

    <section class="grid">
      <div class="box">
        <strong>Traffic</strong>
        Latest flow and congestion state
      </div>
      <div class="box">
        <strong>Air Quality</strong>
        PM2.5 threshold compliance
      </div>
      <div class="box">
        <strong>Utilities</strong>
        Electricity and water consumption
      </div>
    </section>

    <table>
      <thead>
        <tr>
          <th>Sensor</th>
          <th>Latest Reading</th>
          <th>Threshold</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td colspan="4">Bind this table with data from /api/readings and /api/zones.</td>
        </tr>
      </tbody>
    </table>
  </body>
</html>
