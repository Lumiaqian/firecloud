/** Local design-preview initializers. Call once after the corresponding preview HTML exists.
 * These functions are not React components or production data adapters.
 */
declare namespace SkyLetter {
  function InkActions(document: Document): void;
  function CitySearch(document: Document): void;
  function PlaceRow(document: Document): void;
  function ObservationSheet(document: Document): void;
  function PaperNote(document: Document): void;
  function ForecastStrip(document: Document): void;
  function FactorGrid(document: Document): void;
  function StatusNote(document: Document): void;
  function WeatherStage(document: Document): void;
  function MoonPhase(document: Document): void;
}
