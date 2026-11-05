CREATE TABLE public.sedes (id text PRIMARY KEY, nombre text NOT NULL, turno text NOT NULL, horario_inicio text NOT NULL, horario_fin text NOT NULL);
CREATE TABLE public.grupos (id text PRIMARY KEY, nombre text NOT NULL, edad_min int NOT NULL, edad_max int NOT NULL, cupo_barda int NOT NULL, cupo_confluencia int NOT NULL);
CREATE TABLE public.quincenas (numero int PRIMARY KEY, fecha_inicio date NOT NULL, fecha_fin date NOT NULL, tematica text NOT NULL, cuota int NOT NULL DEFAULT 290000);
CREATE TABLE public.extras (id text PRIMARY KEY, nombre text NOT NULL, turno text NOT NULL, precio int NOT NULL, cupo int NOT NULL, grupos_excluidos text[] NOT NULL DEFAULT '{}');
CREATE TABLE public.cupo_ocupado (quincena int NOT NULL REFERENCES public.quincenas(numero), grupo text NOT NULL REFERENCES public.grupos(id), sede text NOT NULL REFERENCES public.sedes(id), inscriptos int NOT NULL DEFAULT 0, PRIMARY KEY (quincena, grupo, sede));
CREATE TABLE public.extra_ocupado (extra text NOT NULL REFERENCES public.extras(id), quincena int NOT NULL REFERENCES public.quincenas(numero), inscriptos int NOT NULL DEFAULT 0, PRIMARY KEY (extra, quincena));
CREATE TABLE public.inscripciones (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), nino text NOT NULL, fecha_nacimiento date NOT NULL, adulto text NOT NULL, telefono text NOT NULL, email text NOT NULL, sede text NOT NULL REFERENCES public.sedes(id), grupo text NOT NULL REFERENCES public.grupos(id), quincenas int[] NOT NULL, extras jsonb NOT NULL DEFAULT '[]', total int NOT NULL, created_at timestamptz NOT NULL DEFAULT now());

GRANT SELECT ON public.sedes, public.grupos, public.quincenas, public.extras, public.cupo_ocupado, public.extra_ocupado TO anon, authenticated;
GRANT ALL ON public.sedes, public.grupos, public.quincenas, public.extras, public.cupo_ocupado, public.extra_ocupado, public.inscripciones TO service_role;

ALTER TABLE public.sedes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grupos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quincenas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.extras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cupo_ocupado ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.extra_ocupado ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inscripciones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lectura publica" ON public.sedes FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "lectura publica" ON public.grupos FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "lectura publica" ON public.quincenas FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "lectura publica" ON public.extras FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "lectura publica" ON public.cupo_ocupado FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "lectura publica" ON public.extra_ocupado FOR SELECT TO anon, authenticated USING (true);

INSERT INTO public.sedes VALUES ('barda','Sede Barda','mañana','9:00','13:00'),('confluencia','Sede Confluencia','tarde','13:30','17:30');
INSERT INTO public.grupos VALUES ('chispas','Chispas',3,5,20,18),('brotes','Brotes',6,8,25,22),('ramas','Ramas',9,11,25,22),('copas','Copas',12,13,20,18);
INSERT INTO public.quincenas VALUES (1,'2027-01-04','2027-01-15','Exploradores del río',290000),(2,'2027-01-18','2027-01-29','Guardianes de los álamos',290000),(3,'2027-02-01','2027-02-12','Chacra y cosecha',290000),(4,'2027-02-15','2027-02-26','Noche de estrellas',290000);
INSERT INTO public.extras VALUES ('natacion','Natación en el río','mañana',45000,15,'{chispas}'),('ceramica','Taller de cerámica','mañana',35000,12,'{}'),('kayak','Kayak en la confluencia','tarde',55000,10,'{chispas,brotes}');
INSERT INTO public.cupo_ocupado (quincena, grupo, sede, inscriptos) SELECT q.numero, g.id, s.id, 0 FROM public.quincenas q, public.grupos g, public.sedes s;
INSERT INTO public.extra_ocupado (extra, quincena, inscriptos) SELECT e.id, q.numero, 0 FROM public.extras e, public.quincenas q;
UPDATE public.cupo_ocupado SET inscriptos = 20 WHERE quincena=2 AND grupo='chispas' AND sede='barda';
UPDATE public.cupo_ocupado SET inscriptos = 22 WHERE quincena=1 AND grupo='brotes' AND sede='confluencia';
UPDATE public.cupo_ocupado SET inscriptos = 12 WHERE quincena=1 AND grupo='ramas' AND sede='barda';
UPDATE public.extra_ocupado SET inscriptos = 12 WHERE extra='ceramica' AND quincena=3;
UPDATE public.extra_ocupado SET inscriptos = 10 WHERE extra='kayak' AND quincena=4;

CREATE OR REPLACE FUNCTION public.confirmar_inscripcion(
  p_nino text, p_fecha_nacimiento date, p_adulto text, p_telefono text, p_email text,
  p_sede text, p_quincenas int[], p_extras jsonb
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_edad int; v_grupo grupos%ROWTYPE; v_sede sedes%ROWTYPE; v_q int; v_cupo int; v_ocup int;
  v_item jsonb; v_extra extras%ROWTYPE; v_extras_total int := 0; v_total int; v_id uuid;
BEGIN
  IF length(trim(coalesce(p_nino,''))) = 0 OR length(p_nino) > 100 OR length(trim(coalesce(p_adulto,''))) = 0 OR length(p_adulto) > 100
     OR length(coalesce(p_telefono,'')) < 6 OR length(p_telefono) > 30 OR p_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' OR length(p_email) > 255 THEN
    RAISE EXCEPTION 'Datos inválidos';
  END IF;
  SELECT * INTO v_sede FROM sedes WHERE id = p_sede;
  IF NOT FOUND THEN RAISE EXCEPTION 'Sede inválida'; END IF;
  v_edad := date_part('year', age(date '2027-01-04', p_fecha_nacimiento));
  SELECT * INTO v_grupo FROM grupos WHERE v_edad BETWEEN edad_min AND edad_max;
  IF NOT FOUND THEN RAISE EXCEPTION 'No entra en ninguno de nuestros grupos'; END IF;
  IF p_quincenas IS NULL OR array_length(p_quincenas,1) IS NULL OR array_length(p_quincenas,1) > 4 THEN RAISE EXCEPTION 'Elegí al menos una quincena'; END IF;

  FOREACH v_q IN ARRAY p_quincenas LOOP
    v_cupo := CASE WHEN p_sede = 'barda' THEN v_grupo.cupo_barda ELSE v_grupo.cupo_confluencia END;
    SELECT inscriptos INTO v_ocup FROM cupo_ocupado WHERE quincena = v_q AND grupo = v_grupo.id AND sede = p_sede FOR UPDATE;
    IF NOT FOUND OR v_ocup >= v_cupo THEN RAISE EXCEPTION 'La quincena % ya no tiene lugar', v_q; END IF;
    UPDATE cupo_ocupado SET inscriptos = inscriptos + 1 WHERE quincena = v_q AND grupo = v_grupo.id AND sede = p_sede;
  END LOOP;

  FOR v_item IN SELECT * FROM jsonb_array_elements(coalesce(p_extras,'[]'::jsonb)) LOOP
    SELECT * INTO v_extra FROM extras WHERE id = v_item->>'extra';
    IF NOT FOUND OR v_extra.turno <> v_sede.turno OR v_grupo.id = ANY(v_extra.grupos_excluidos)
       OR NOT ((v_item->>'quincena')::int = ANY(p_quincenas)) THEN RAISE EXCEPTION 'Extra inválido'; END IF;
    SELECT inscriptos INTO v_ocup FROM extra_ocupado WHERE extra = v_extra.id AND quincena = (v_item->>'quincena')::int FOR UPDATE;
    IF v_ocup >= v_extra.cupo THEN RAISE EXCEPTION '% ya no tiene lugar en la quincena %', v_extra.nombre, v_item->>'quincena'; END IF;
    UPDATE extra_ocupado SET inscriptos = inscriptos + 1 WHERE extra = v_extra.id AND quincena = (v_item->>'quincena')::int;
    v_extras_total := v_extras_total + v_extra.precio;
  END LOOP;

  v_total := CASE WHEN array_length(p_quincenas,1) = 4 THEN 1000000 ELSE 290000 * array_length(p_quincenas,1) END + v_extras_total;
  INSERT INTO inscripciones (nino, fecha_nacimiento, adulto, telefono, email, sede, grupo, quincenas, extras, total)
  VALUES (trim(p_nino), p_fecha_nacimiento, trim(p_adulto), trim(p_telefono), trim(p_email), p_sede, v_grupo.id, p_quincenas, coalesce(p_extras,'[]'::jsonb), v_total)
  RETURNING id INTO v_id;
  RETURN jsonb_build_object('id', v_id, 'total', v_total, 'grupo', v_grupo.nombre);
END $$;
REVOKE ALL ON FUNCTION public.confirmar_inscripcion FROM public;
GRANT EXECUTE ON FUNCTION public.confirmar_inscripcion TO anon, authenticated;