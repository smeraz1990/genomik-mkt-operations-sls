//librerias externas
const AWS = require('aws-sdk');
const sql = require('mssql');
const sanitizer = require('sanitize')();
// const paginate = require('jw-paginate');

//librerias internas
const STAGE = process.env.stage;
const Utils = require('../utils/utils');
const { getSSM } = require('../config/const');

const SolicitudMateriales = () => {};


SolicitudMateriales.getSolicitudes = async(req, context, callback) => {

    try {
        const getConfig = await getSSM();
        let requestData = req.body;
        let bitEspecialista = requestData.bitEspecialista
        let estatus_id = '1,2,3'
        let bitCreador = requestData.bitCreador
        const usuarioSessionId = Utils.getUsuarioSessionId(req?.headers?.Authorization);
        const NivelSesionId = Utils.getNivelSessionId(req.headers.Authorization);
        const ListAdmin = [3521,2016,1948]
        let Bit_Sol_Mat_Cancel = requestData.Bit_Sol_Mat_Cancel || ""
        let Material_Comunicacion_Id = requestData.Material_Comunicacion_Id || null
        let uso_material_id = requestData.uso_material_id || ""
        let institucion_Id = requestData.institucion_Id || ""
        let usuario_id = requestData.usuario_id || ""
        let zona_id = requestData.zona_id || ""
        let periodo_Id = requestData.periodo_Id || ""
        let mes = requestData.mes || ""
        let ano = requestData.ano || ""
        let fechaInicio = requestData.fechaInicio || ""
        let txtQuerySolicitudes = ""
        console.log("creador", bitCreador)
        console.log("creador", ListAdmin.indexOf(usuarioSessionId))
        if (bitCreador !== "" && (ListAdmin.indexOf(usuarioSessionId) == -1 /*&& NivelSesionId !== 1*/))
        {
    
           
                txtQuerySolicitudes += `
                and (
                    i.Zona_Cliente_clasificacion_id in ( select distinct Zona_Cliente_clasificacion_id
                    from responsable_adjunto  ra
                    inner join Institucion i on ra.Institucion_id=i.Institucion_id
                    where usuario_id = ${usuarioSessionId}
                    )
            or 
                    i.Zona_Cliente_clasificacion_id in ( select distinct Zona_Cliente_clasificacion_id
                    from Institucion
                    where responsable_id = ${usuarioSessionId}
                )
            or
                Usuario_creo_id = ${usuarioSessionId}
            )`
            
        }
        txtQuerySolicitudes += (Bit_Sol_Mat_Cancel != "") ? `AND Bit_Sol_Mat_Cancel = ${Bit_Sol_Mat_Cancel}` :  "";
        txtQuerySolicitudes += (estatus_id != "") ? `AND estatus_id in (${estatus_id})` :  "";
        txtQuerySolicitudes += (Material_Comunicacion_Id != null) ? `AND Material_Comunicacion_Id in (${Material_Comunicacion_Id})` :  "";
        txtQuerySolicitudes += (uso_material_id != "") ? `AND smc.uso_material_id = ${uso_material_id}` :  "";
        txtQuerySolicitudes += (institucion_Id != "") ? `AND smc.institucion_Id = ${institucion_Id}` :  "";
        txtQuerySolicitudes += (usuario_id != "") ? `AND sv.Usuario_creo_id = ${usuario_id}` :  "";
        txtQuerySolicitudes += (zona_id != "") ? `AND i.Zona_Cliente_clasificacion_id = ${zona_id}` :  "";
        
        if(periodo_Id === 1)
        {
            txtQuerySolicitudes += `AND month(Fecha_Solicitud) = ${mes} AND year(Fecha_Solicitud) = ${ano}`;
        }
        else if(periodo_Id === 2)
        {
            txtQuerySolicitudes += `AND Fecha_Solicitud >= ${fechaInicio}
				                    AND Fecha_Solicitud <= DateAdd("d", 1, ${fechaFin})`;
        }

        // Open DB Connection
        let pool = await sql.connect(getConfig)

        const sqlQuerySolicitudes = `
        SELECT 
                smc.Solicitud_Material_Comunicacion_Id,
                Fecha_Solicitud as Fecha_Solicitud,
                smc.Fecha_Estimada_entrega_ESP as Fecha_Esperada,
                z.Zona_Cliente_clasificacion AS Zona,
                u.f_nombre AS Usuario_Alta, ---Nombre + ' ' + u.Apellido_Pat + ' ' + u.Apellido_Mat
                i.Nombre_Comercial AS Cliente,
                smc.estatus_id,
                sme.Estatus,
                SUM(sm.Cantidad) AS Total_Materiales,
                SUM(sm.CantidadProp) AS Total_MaterialesProp,
				Uso_material,
				smc.Uso_material_id,
				Nom_Solicitud,
				Fecha_subio_Solicitud as FechaSubioSolicitud,
				Fecha_Respuesta as FechaRespuesta,
				Fecha_Sol_Cancel as FechaSolCancel,
				Fecha_Sol_Procesada as FechaAceptada,
				Comentario_Sol_Cancel as ComentarioSolCancel,
				Comentario_Creo as ComentarioCreo,
				 u1.f_nombre as UsuarioInventario,
				 smc.bit_impresion
            FROM CO_Solicitud_Materiales_Comunicacion  smc
            INNER JOIN CO_Solicitud_Materiales_Uso SMU ON smc.Uso_Material_Id = SMU.Uso_Material_Id
            LEFT JOIN Institucion i ON i.Institucion_Id = smc.Institucion_Id
            LEFT JOIN Zona_Cliente_clasificacion z ON z.Zona_Cliente_clasificacion_id = i.Zona_Cliente_clasificacion_id
            INNER JOIN CO_Solicitud_Materiales_Estatus sme ON sme.Solicitud_Material_Estatus_Id = smc.Estatus_Id
            INNER JOIN co_solicitud_materiales sm ON sm.Solicitud_Material_Comunicacion_Id = smc.Solicitud_Material_Comunicacion_Id
            left join CO_Solicitud_Materiales_Validacion sv on sm.solicitud_material_comunicacion_id = sv.solicitud_material_comunicacion_id
            INNER JOIN Usuario u ON u.Usuario_Id = sv.Usuario_creo_id
            left JOIN Usuario u1 ON u1.Usuario_Id = smc.usuario_inventario_id
            Where 1=1
			${txtQuerySolicitudes}
            GROUP BY smc.Solicitud_Material_Comunicacion_Id,
            smc.Fecha_Solicitud,
            z.Zona_Cliente_clasificacion,
            u.f_nombre,
            ---u.Nombre + ' ' + u.Apellido_Pat + ' ' + u.Apellido_Mat,
            i.Nombre_Comercial,
            sv.Fecha_creo,
            smc.Fecha_Solicitud,
            smc.estatus_id,
            sme.Estatus,
			Uso_material,
			smc.Uso_material_id,
			Fecha_Estimada_entrega_ESP,
			Nom_Solicitud,
			Fecha_subio_Solicitud,
			Fecha_Respuesta,
			Fecha_Sol_Cancel,
			Fecha_Sol_Procesada,
			Comentario_Sol_Cancel,
			Comentario_Creo,
			u1.f_nombre,
			smc.bit_impresion
        `;

        console.log("Mostart INFO QUERY ", sqlQuerySolicitudes)

        let result = await pool.request().query(sqlQuerySolicitudes);

        // Close DB Connection
        pool.close();
        console.info("✅ ITEMS:", result.recordset);

        return {
            status: "success",
            data: result.recordset
        };
    } catch (err) {
        // Error running our SQL Query
        console.error("ERROR: Exception thrown running SQL", err);
        Utils.errorResponse(500, err.message, callback)
    }
    sql.on('error', err => console.error(err, "ERROR: Error raised in MSSQL utility"));
}



module.exports = SolicitudMateriales;