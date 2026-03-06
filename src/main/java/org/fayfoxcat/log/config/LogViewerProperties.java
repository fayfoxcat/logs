package org.fayfoxcat.log.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.ArrayList;
import java.util.List;

/**
 * 日志查看器配置属性类
 * 用于从 application.yml 中读取配置
 * 
 * @author fayfoxcat
 * @version 0.0.1
 */
@ConfigurationProperties(prefix = "logs.viewer")
public class LogViewerProperties {
    
    /**
     * 允许访问的日志目录列表（白名单）
     * 只有在此列表中的目录才能被访问
     */
    private List<String> paths = new ArrayList<>();
    
    /**
     * 日志查看器的访问端点
     * 默认为 /logs
     */
    private String endpoint = "/logs";
    
    /**
     * 是否启用权限控制
     * 默认为 true，设置为 false 时跳过权限验证
     */
    private boolean enableAuth = true;

    public List<String> getPaths() {
        return paths;
    }

    public void setPaths(List<String> paths) {
        this.paths = paths;
    }

    public String getEndpoint() {
        return endpoint;
    }

    public void setEndpoint(String endpoint) {
        this.endpoint = endpoint;
    }
    
    public boolean isEnableAuth() {
        return enableAuth;
    }

    public void setEnableAuth(boolean enableAuth) {
        this.enableAuth = enableAuth;
    }
}