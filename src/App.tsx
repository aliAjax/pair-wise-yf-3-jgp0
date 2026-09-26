import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "@/pages/Home";
import LocationsPage from "@/pages/LocationsPage";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/locations" element={<LocationsPage />} />
      </Routes>
    </Router>
  );
}
