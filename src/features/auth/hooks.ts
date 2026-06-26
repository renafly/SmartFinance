import { useEffect, useState } from "react";

import { supabase } from "../../lib/supabase";

export function useSession() {

    const [session, setSession] = useState(null);

    useEffect(() => {

        supabase.auth.getSession().then(({ data }) => {

            setSession(data.session);

        });

        const { data } = supabase.auth.onAuthStateChange(
            (_, session) => {

                setSession(session);

            }
        );

        return () => {

            data.subscription.unsubscribe();

        };

    }, []);

    return session;

}