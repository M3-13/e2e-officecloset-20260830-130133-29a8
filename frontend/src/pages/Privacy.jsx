export default function Privacy() {
  return (
    <section className="page">
      <h1 className="page-title">Datenschutzerklärung</h1>

      <h2>1. Verantwortlicher</h2>
      <p>
        Verantwortlich für die Datenverarbeitung ist der Betreiber von
        OfficeCloset. Die Kontaktdaten entnehmen Sie dem Impressum.
      </p>

      <h2>2. Grundsatz</h2>
      <p>
        OfficeCloset ist eine lokale Demo-Anwendung. Sämtliche Daten werden
        ausschließlich lokal auf dem Gerät bzw. dem von Ihnen selbst
        betriebenen Server gespeichert. Es findet keine Übermittlung an
        Dritte statt.
      </p>

      <h2>3. Verarbeitete Daten</h2>
      <p>Im Rahmen der Nutzung werden folgende Daten verarbeitet:</p>
      <ul>
        <li>
          <strong>E-Mail-Adresse:</strong> wird zur Identifikation und
          Anmeldung an Ihrem Benutzerkonto verwendet.
        </li>
        <li>
          <strong>Passwort:</strong> wird nicht im Klartext, sondern
          ausschließlich in verschlüsselter Form (bcrypt) gespeichert.
        </li>
        <li>
          <strong>Bilder:</strong> hochgeladene Kleidungsstückbilder werden
          lokal gespeichert und ausschließlich innerhalb der Anwendung
          angezeigt.
        </li>
        <li>
          <strong>Kleidungsstücke und Outfits:</strong> die von Ihnen
          angelegten Daten (Name, Kategorie, Farbe, Marke, Notizen) dienen
          der Verwaltung Ihrer Garderobe.
        </li>
      </ul>

      <h2>4. Zweck der Verarbeitung</h2>
      <p>
        Die Verarbeitung erfolgt ausschließlich zur Bereitstellung der
        Funktionalität der Anwendung: Verwaltung Ihrer Garderobe, Erstellung
        von Outfits sowie die sichere Anmeldung an Ihrem Konto.
      </p>

      <h2>5. Löschung Ihrer Daten</h2>
      <p>
        Sie können Ihr Konto jederzeit in den Einstellungen löschen. Dabei
        werden Ihr Benutzerkonto sowie alle zugehörigen Kleidungsstücke,
        Outfits, Datensätze und Bilddateien unwiderruflich entfernt.
      </p>

      <h2>6. Keine Drittressourcen</h2>
      <p className="page-description">
        Diese Anwendung lädt keine Ressourcen von Drittanbietern. Alle
        Schriften, Skripte und Bilder werden lokal ausgeliefert.
      </p>
    </section>
  );
}
