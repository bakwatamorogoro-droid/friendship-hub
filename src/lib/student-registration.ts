import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type RegisteredStudent = {
  registration_number: string;
  full_name: string;
  phone: string;
  course: string;
  year_of_study: string;
};
const KEY = "mumso.student.reg";
export function rememberStudentReg(reg: string) {
  try { sessionStorage.setItem(KEY, reg.trim().toUpperCase()); } catch { /* Storage can be disabled. */ }
}

export function useRegisteredStudent() {
  const [reg, setReg] = useState("");
  const [student, setStudent] = useState<RegisteredStudent | null>(null);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");
  const requestId = useRef(0);
  const lookup = useCallback(async (value: string) => {
    const id = ++requestId.current;
    const clean = value.trim().toUpperCase();
    setStudent(null);
    setError("");
    if (!/^[A-Z0-9][A-Z0-9/._ -]{3,59}$/.test(clean)) {
      setSearching(false);
      setError("Andika REG namba sahihi ya chuo.");
      return;
    }
    setSearching(true);
    try {
      const { data, error: failure } = await supabase.rpc("student_lookup", { _reg: clean });
      if (id !== requestId.current) return;
      const row = data?.[0];
      if (failure) { setError("Taarifa hazijapatikana kwa sasa. Jaribu tena."); return; }
      if (!row) { setError("REG namba hii haijasajiliwa. Jisajili kwanza."); return; }
      setReg(clean);
      setStudent({ ...row, registration_number: clean });
      rememberStudentReg(clean);
    } catch {
      if (id === requestId.current) setError("Muunganisho umeshindikana. Jaribu tena.");
    } finally {
      if (id === requestId.current) setSearching(false);
    }
  }, []);
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(KEY);
      if (saved) { setReg(saved); void lookup(saved); }
    } catch { /* Start with an empty REG on restricted browsers. */ }
    return () => { requestId.current += 1; };
  }, [lookup]);
  const changeReg = (value: string) => {
    requestId.current += 1;
    setReg(value); setStudent(null); setError(""); setSearching(false);
    try { sessionStorage.removeItem(KEY); } catch { /* Optional storage. */ }
  };
  return { reg, student, searching, error, lookup, changeReg };
}